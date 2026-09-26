# Architecture

A single-page React app talking directly to Supabase. There is no server of our
own: all the business rules that matter for safety (no double booking, consent,
opening hours, who may cancel) are enforced **inside the database**. The frontend
repeats some of them only to show a nice UI.

## Data flow

At startup `residence/ResidenceProvider` loads the residence's `settings` row and
its machines. Every component reads them with `useResidence()`. The admin panel
calls `reload()` after each change.

```
pages/BookingPage ──► hooks/useDayBookings ──► api/bookings.fetchDayBookings ──► table bookings (read)
        │                     ▲
        │                     └── api/bookings.subscribeToBookingChanges ◄── Supabase Realtime
        │
        ├─► components/BookingModal ──► auth/identity.createMyBooking ──► api/bookings.createBooking ──► RPC create_booking
        └─► components/CancelBookingSheet ──► auth/identity.cancelMyBooking ──► api/bookings.cancelBooking ──► RPC cancel_booking
```

Each layer has one job:

| Layer         | Knows about                            | Must not                                  |
| ------------- | -------------------------------------- | ----------------------------------------- |
| `residence/`  | Settings + machines, loaded once       | Hold per-screen state                     |
| `pages/`      | Screen layout, which sheet is open     | Call Supabase or localStorage             |
| `components/` | Rendering + user input                 | Call Supabase                             |
| `hooks/`      | Loading state, refetching, Realtime    | Render anything                           |
| `auth/`       | Who the user is, what is theirs        | Build queries (it calls `api/`)           |
| `api/`        | Supabase, table/column names, RPC args | Use React or i18n                         |
| `lib/`        | Pure functions (dates, slots, config)  | Do I/O                                    |

Database rows use `snake_case` columns. `api/` converts them to the camelCase
types in `lib/types.ts`, so nothing outside `api/` knows a column name.

## Security model

The app uses Supabase's **anon key**, which is public by design (it ships in the
JavaScript). Everything below is enforced by Postgres, not by the frontend.

- **`machines`** and **`settings`** (one row: residence name, apartment count,
  opening hours, booking window): anyone can read them. Clients cannot write
  them directly; only the admin functions below change them.
- **`bookings`**: anyone can read (the schedule is public, like the paper sheet).
  Direct `insert/update/delete` is revoked from everyone.
- **Writes only through two `security definer` functions:**
  - `create_booking(...)` checks consent, machine active, slot alignment,
    opening hours, not in the past, not too far ahead. It inserts the booking plus
    a random **cancel token** and returns both.
  - `cancel_booking(id, token)` deletes the booking only if the token matches.
  - `create_booking` also checks that the apartment is a number between 1 and
    `settings.apartment_count`, and reads the opening hours and window from `settings`.
- **Admin functions** (`admin_update_settings`, `admin_add_machine`,
  `admin_update_machine`, `admin_delete_booking`): callable only by signed-in
  users, and each one first checks `is_admin()`, meaning the caller must be in the
  **`admins`** table (Supabase Auth user ids). `admins` itself is readable by no
  one. Public sign-ups are disabled in the dashboard, so the only accounts are
  the ones the maintainer creates.
- **`booking_secrets`** holds the cancel tokens. No one can read it; only the two
  functions use it.
- **No double booking:** a `unique (machine_id, slot_start)` constraint on
  `bookings`. Two people pressing "Book" at the same instant: one wins, the other
  gets `slot_taken`.

The cancel token is stored only in the booking phone's `localStorage` (see
`auth/identity.ts`). That's why cancelling works only from that device.

## Notice board and notifications

```
PostNoticeSheet ─► identity.postMyNotice ─► RPC post_notice (token, time window, max 3)
                                        └─► POST /api/notify {noticeId}
api/notify.ts (Vercel, service role) ─► RPC claim_notice_push ─► web-push ─► browsers
public/push-handler.js (service worker) ─► shows the notification
```

- **`notices`** are public while `settings.notices_enabled` is on (RLS policy). A
  notice can be posted from 1 hour before the slot until it ends, max 3 per booking;
  the free text is 1–100 characters. Rules duplicated in `src/lib/notices.ts`.
- **`push_subscriptions`** link a browser's Web Push subscription to a booking made
  on it (`register_push`, token-checked, max 5 per booking). No client can read
  them. Only addresses of real push services (Google, Mozilla, Apple, Microsoft)
  are accepted, so `api/notify.ts` can never be made to call an arbitrary server.
- **`claim_notice_push`** is callable only with the service role key. It marks the
  notice as sent (so each notice is pushed at most once, however many times
  `/api/notify` is called) and returns the targets: same machine, bookings starting
  in the 3 hours after the notice's slot, excluding the poster's own devices.
- **Secrets:** the service role key and the VAPID private key live only in
  Vercel's environment variables, read by `api/notify.ts`. Every file in `api/`
  becomes a public endpoint, so don't put helpers there.
- **iPhone:** Safari only allows web notifications for apps added to the Home
  Screen (iOS 16.4+). `auth/push.ts` reports that as `needsInstall`.
- **Local dev:** `npm run dev` has no service worker and doesn't run `api/`, so
  notifications can only be tested on the deployed site.

**Known weakness:** anyone with the link can create bookings under any name.
[FUTURE-AUTH.md](FUTURE-AUTH.md) describes the fix (university login).

### Error codes

`create_booking` raises its error as a plain code (`slot_taken`,
`consent_required`, `apartment_invalid`, `machine_not_available`, `slot_not_aligned`,
`slot_out_of_hours`, `slot_in_past`, `slot_too_far_ahead`). `api/bookings.ts`
turns it into a `BookingError`, and the UI shows `t('errors.<code>')`. When you add a
new code in SQL, add it to `BOOKING_ERROR_CODES` and to both locale files.

## Where the booking rules live

Opening hours, booking window and apartment count live in **one place**: the
`settings` table, edited from the admin panel. The UI reads them through
`useResidence()`, and `create_booking` reads the same row.

Two rules are still in code, on both sides. **Change both together:**

| Rule        | Frontend                           | Database (`create_booking`)            |
| ----------- | ---------------------------------- | -------------------------------------- |
| Slot length | `SLOT_MINUTES = 60` in `config.ts` | `interval '1 hour'` + minute must be 0 |
| Timezone    | the phone's local time             | `'Europe/Rome'`                        |

The latest `create_booking` definition is in
`supabase/migrations/20260924120000_admin_settings.sql`. Older migrations contain
out-of-date versions.

## Database changes

1. Create `supabase/migrations/<YYYYMMDDHHMMSS>_<name>.sql` (or
   `npx supabase migration new <name>`).
2. Write the SQL. To change a function, copy its **latest** version and use
   `create or replace function`.
3. Review it (`.claude/agents/db-reviewer` if you use Claude Code).
4. Apply it: Supabase dashboard → **SQL Editor** → paste → Run. (`npx supabase db
   push` also works if you've done `supabase login` + `link`.)
5. Commit the file. The repo must always match the live database.

Never change the schema only in the dashboard.

## Frontend notes

- **Routing:** `HashRouter` (`/#/` and `/#/prenotazioni`), so Vercel needs no
  rewrite rules.
- **Live updates:** `useDayBookings` refetches the visible day on every Realtime
  event on `bookings`, and ignores replies for a day the user has already left.
- **Sheets:** every popup (booking form, cancel confirmation, date picker, notice
  form) uses `components/ui/Sheet.tsx`; "are you sure?" deletions use `ui/ConfirmSheet.tsx`. It's a bottom sheet on phones and a centred dialog on desktop.
- **Styling:** Tailwind utility classes. Brand colours are tokens in
  `src/index.css` (`brand-*` indigo, `accent-*` red, from DSU Toscana). Dark
  mode follows the phone setting via `dark:` classes.
- **Free tier:** Supabase pauses a free project after ~1 week without traffic.
  If the app suddenly can't load anything, check the dashboard and hit "Restore".
