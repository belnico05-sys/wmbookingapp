# Lavatrici — laundry booking app

Booking app for the shared washing machines and dryers of a DSU Toscana student
residence. It replaces the paper sheet where students wrote their time slots.
Students open it on their phones (link / QR code), pick a day and a machine, and
book a free 1-hour slot with their name and apartment number.

**Live:** https://wmbookingapp.vercel.app/

- No student accounts: users identify with name + apartment number (1 to the
  number of apartments set by the manager). A consent checkbox is mandatory
  before every booking.
- The residence's manager has an **admin panel** (`/#/admin`) to set the
  residence name, number of apartments, opening hours and booking window, to
  add machines or put them under maintenance, and to delete bookings.
- **One copy per residence:** each residence runs its own deployment + database
  (see [Set up a new residence](#set-up-a-new-residence)).
- A booking can be cancelled (the "−" button, or the 📋 page) only from the
  device that made it.
- The schedule updates live on every phone.
- **Notice board ("Bacheca")**, switched on/off by the manager: on their own slot,
  a student can post "finishing late", "finished early" or a short message (max
  100 characters). People booked on the same machine in the next 3 hours get a
  **push notification**, if they turned notifications on. On iPhone this only
  works when the app is added to the Home Screen (iOS 16.4+).
- Italian (primary) and English UI. Installable as a PWA.

## Tech stack

| Part      | Tool                                                        |
| --------- | ----------------------------------------------------------- |
| Frontend  | React 19 + TypeScript (strict) + Vite, `vite-plugin-pwa`    |
| Styling   | Tailwind CSS 4, mobile-first, auto dark mode                |
| Backend   | Supabase (free tier): Postgres + Realtime, no custom server |
| i18n      | `react-i18next`, `src/locales/it.json` + `en.json`          |
| Hosting   | Vercel, auto-deploys every push to `master`                 |

## Getting started

Requirements: Node.js 20+ and the Supabase URL + anon key (ask the maintainer,
or Supabase dashboard → Project Settings → API).

```powershell
npm install
copy .env.example .env.local   # then fill in the two values
npm run dev -- --host          # --host makes it reachable from your phone on the same Wi-Fi
```

Vite prints a `Network:` URL. Open it on your phone.

| Command           | What it does                                  |
| ----------------- | --------------------------------------------- |
| `npm run dev`     | Dev server with hot reload                    |
| `npm run build`   | Type-check + production build into `dist/`    |
| `npm run preview` | Serve the production build locally            |
| `npm run lint`    | ESLint (must be clean before committing)      |
| `npm test`        | Unit tests (Vitest)                           |

`.env.local` is git-ignored. Never commit keys.

## Project structure

```
src/
  api/          The ONLY code that talks to Supabase
    client.ts     Supabase client (reads .env.local)
    settings.ts   fetchSettings(): the residence's configuration
    machines.ts   fetchMachines()
    bookings.ts   fetchDayBookings(), createBooking(), cancelBooking(), live updates
    notices.ts    Notice board: read, post, push subscription, live updates
    admin.ts      Manager sign-in + admin-only writes
  auth/
    identity.ts   Who the student is + which bookings are theirs (swap this for a real login)
    push.ts       This device's notification permission + subscription
  residence/    Loads settings + machines once; useResidence() gives them to any component
  hooks/        React hooks that load data: useDayBookings, useActiveNotices, useAdminSession
  pages/        One component per screen: BookingPage (/), MyBookingsPage (/prenotazioni),
                AdminPage (/admin)
  components/   UI pieces (SlotList, BookingModal, CancelBookingSheet, DatePicker, …)
    admin/        The admin panel sections
    ui/           Sheet (bottom-sheet / dialog shell), ConfirmSheet, styles.ts (shared classes)
  lib/          Pure helpers, no React, no network
    config.ts     Slot length + the BookingRules type
    slots.ts      Slot and day maths (takes the residence's rules as a parameter)
    machines.ts   machineName(): "Lavatrice 1 (interna)" from type + label + location
    notices.ts    Notice board rules (when you can post, 100-char limit, how long it shows)
    calendar.ts   Month grid for the date picker
    format.ts     Date/time formatting
    ics.ts        Calendar reminder (.ics file + Google Calendar link)
    types.ts      Domain types: Machine, Booking
  locales/      it.json (primary) and en.json — must have the same keys
api/
  notify.ts     Vercel serverless function that sends the push notifications
public/
  push-handler.js  Service-worker code that shows notifications
supabase/
  migrations/   The database schema, as SQL files (source of truth)
docs/
  ARCHITECTURE.md   How the pieces fit together, security model, rules to keep in sync
  FUTURE-AUTH.md    Plan for university login
```

The dependency direction is one-way: **pages → components/hooks → auth → api →
Supabase**. Components never import from `api/client.ts` directly.

## Admin panel

Open `https://<your-site>/#/admin` and sign in with the manager's email +
password. There is no link in the student UI, so the manager bookmarks it.

| Section   | What it does                                                                  |
| --------- | ----------------------------------------------------------------------------- |
| Residence | Name shown in the header, number of apartments, first/last slot, days bookable ahead |
| Machines  | Put under maintenance (greyed out, not bookable), retire/restore, rename (label), add |
| Bookings  | All upcoming bookings; delete fake or wrong ones                              |

Changes apply to the app immediately. A settings change never deletes existing
bookings. Everything is enforced by the database, not only by the panel.

**Create the manager account** (once per residence, in the Supabase dashboard):
1. Authentication → Sign In / Providers → turn **off** "Allow new users to sign up".
2. Authentication → Users → **Add user** → email + password, tick "Auto Confirm User".
3. SQL Editor → run
   `insert into admins (user_id) select id from auth.users where email = 'manager@example.com';`

To remove a manager:
`delete from admins where user_id = (select id from auth.users where email = '...');`

## Set up a new residence

Each residence gets its own copy, with no code changes:
1. **Supabase:** create a new project (free tier, EU region). In the SQL Editor, run
   every file in `supabase/migrations/` **in filename order**.
2. **Manager account:** follow the three steps above.
3. **Vercel:** import this GitHub repo as a new project and set the environment
   variables (Settings → Environment Variables), see the table below.
4. Open `/#/admin` on the new site and set the name, apartments and hours.
   The machines start as the 5 from the original residence: rename, retire or
   add machines to match.

### Environment variables (Vercel)

| Name                        | Where to get it                                              | Secret? |
| --------------------------- | ------------------------------------------------------------ | ------- |
| `VITE_SUPABASE_URL`         | Supabase → Project Settings → API → Project URL              | no      |
| `VITE_SUPABASE_ANON_KEY`    | Supabase → Project Settings → API → `anon` public key        | no      |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` key       | **yes** |
| `VITE_VAPID_PUBLIC_KEY`     | `npx web-push generate-vapid-keys` → Public Key              | no      |
| `VAPID_PRIVATE_KEY`         | same command → Private Key                                   | **yes** |
| `VAPID_SUBJECT`             | the site's URL, e.g. `https://your-site.vercel.app`          | no      |

The last four are only needed for notice-board notifications. Without them the
board still works, just without notifications. Generate a **new** VAPID key pair for
each residence and never commit the secret ones. After changing env vars, redeploy
(Vercel → Deployments → ⋯ → Redeploy).

## Common changes

**Add or change UI text.** Never hardcode strings in components. Add the key to
**both** `src/locales/it.json` and `en.json`, then use `t('group.key')`. Write the
Italian first; it's the main audience.

**Change opening hours, apartments, booking window or machines.** Use the admin
panel. No code change is needed.

**Change the slot length (1 hour).** This is the one rule still in code:
`SLOT_MINUTES` in `src/lib/config.ts` **and** the `'1 hour'` checks in the
`create_booking` function (write a new migration). Existing bookings would no
longer line up with the new slots, so think twice. See
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#where-the-booking-rules-live).

**Change the database schema.** Always through a new file in
`supabase/migrations/` committed to the repo, never only in the dashboard. See
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#database-changes).

**Deploy.** Commit and `git push` to `master`. Vercel builds and publishes in
about a minute. Vercel only sees what's on GitHub, so a local commit alone
deploys nothing.

## Before launch

- The **privacy policy text** is still a placeholder (see `booking.consent` in the
  locale files). It must be written before the app is officially launched. It must
  also mention the notice board: posted notices are public, and turning on
  notifications stores the browser's push subscription (linked to that device's
  bookings, deleted about a day after the slot).
