# Architecture

A single-page React app talking directly to Supabase. There is no server of our
own: all the business rules that matter for safety (no double booking, consent,
opening hours, who may cancel) are enforced **inside the database**. The frontend
repeats some of them only to show a nice UI.

## Data flow

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

- **`machines`**: anyone can read; no one can write (changes only via migrations
  or the SQL Editor).
- **`bookings`**: anyone can read (the schedule is public, like the paper sheet).
  Direct `insert/update/delete` is revoked from everyone.
- **Writes only through two `security definer` functions:**
  - `create_booking(...)` checks consent, machine active, slot alignment,
    opening hours, not in the past, not too far ahead. It inserts the booking plus
    a random **cancel token** and returns both.
  - `cancel_booking(id, token)` deletes the booking only if the token matches.
- **`booking_secrets`** holds the cancel tokens. No one can read it; only the two
  functions use it.
- **No double booking:** a `unique (machine_id, slot_start)` constraint on
  `bookings`. Two people pressing "Book" at the same instant: one wins, the other
  gets `slot_taken`.

The cancel token is stored only in the booking phone's `localStorage` (see
`auth/identity.ts`). That's why cancelling works only from that device.

**Known weakness:** anyone with the link can create bookings under any name.
[FUTURE-AUTH.md](FUTURE-AUTH.md) describes the fix (university login).

### Error codes

`create_booking` raises its error as a plain code (`slot_taken`,
`consent_required`, `machine_not_available`, `slot_not_aligned`,
`slot_out_of_hours`, `slot_in_past`, `slot_too_far_ahead`). `api/bookings.ts`
turns it into a `BookingError`, and the UI shows `t('errors.<code>')`. When you add a
new code in SQL, add it to `BOOKING_ERROR_CODES` and to both locale files.

## Rules that live in two places

The UI needs these to draw the calendar and slots. The database needs them to
refuse bad bookings. **Change both together.**

| Rule                     | Frontend (`src/lib/config.ts`) | Database (`create_booking`)            |
| ------------------------ | ------------------------------ | -------------------------------------- |
| First slot starts        | `FIRST_SLOT_HOUR = 8`          | `extract(hour …) < 8`                  |
| Last slot starts         | `LAST_SLOT_HOUR = 22`          | `extract(hour …) > 22`                 |
| Slot length              | `SLOT_MINUTES = 60`            | `interval '1 hour'` + minute must be 0 |
| Booking window           | `WINDOW_DAYS = 30`             | `interval '31 days'` (see comment)     |
| Timezone                 | the phone's local time         | `'Europe/Rome'`                        |

The latest `create_booking` definition is in
`supabase/migrations/20260615120000_extend_booking_window_30d.sql`. The one in the
init migration is out of date.

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
- **Sheets:** every popup (booking form, cancel confirmation, date picker) uses
  `components/ui/Sheet.tsx`. It's a bottom sheet on phones and a centred dialog on desktop.
- **Styling:** Tailwind utility classes. Brand colours are tokens in
  `src/index.css` (`brand-*` indigo, `accent-*` red, from DSU Toscana). Dark
  mode follows the phone setting via `dark:` classes.
- **Free tier:** Supabase pauses a free project after ~1 week without traffic.
  If the app suddenly can't load anything, check the dashboard and hit "Restore".
