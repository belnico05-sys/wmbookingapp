# Lavatrici — laundry booking app

Booking app for the shared washing machines and dryers of a DSU Toscana student
residence. It replaces the paper sheet where students wrote their time slots.
Students open it on their phones (link / QR code), pick a day and a machine, and
book a free 1-hour slot with their name and apartment number.

**Live:** https://wmbookingapp.vercel.app/

- No accounts: users identify with name + apartment. A consent checkbox is
  mandatory before every booking.
- A booking can be cancelled (the "−" button, or the 📋 page) only from the
  device that made it.
- The schedule updates live on every phone.
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
    machines.ts   fetchMachines()
    bookings.ts   fetchDayBookings(), createBooking(), cancelBooking(), live updates
  auth/
    identity.ts   Who the user is + which bookings are theirs (swap this for a real login)
  hooks/        React hooks that load data: useMachines, useDayBookings
  pages/        One component per screen: BookingPage (/), MyBookingsPage (/prenotazioni)
  components/   UI pieces (SlotList, BookingModal, CancelBookingSheet, DatePicker, …)
    ui/Sheet.tsx  The shared bottom-sheet / dialog shell
  lib/          Pure helpers, no React, no network
    config.ts     Booking rules: opening hours, slot length, booking window
    slots.ts      Slot and day maths
    calendar.ts   Month grid for the date picker
    format.ts     Date/time formatting
    ics.ts        Calendar reminder (.ics file + Google Calendar link)
    types.ts      Domain types: Machine, Booking
  locales/      it.json (primary) and en.json — must have the same keys
supabase/
  migrations/   The database schema, as SQL files (source of truth)
docs/
  ARCHITECTURE.md   How the pieces fit together, security model, rules to keep in sync
  FUTURE-AUTH.md    Plan for university login
```

The dependency direction is one-way: **pages → components/hooks → auth → api →
Supabase**. Components never import from `api/client.ts` directly.

## Common changes

**Add or change UI text.** Never hardcode strings in components. Add the key to
**both** `src/locales/it.json` and `en.json`, then use `t('group.key')`. Write the
Italian first; it's the main audience.

**Change opening hours, slot length or how far ahead people can book.** Change
`src/lib/config.ts` **and** write a new migration that updates the matching check
in the `create_booking` function (copy its latest version from
`supabase/migrations/`). If you only change one side, the UI and the database
disagree. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#rules-that-live-in-two-places).

**Mark a machine out of order.** In the Supabase SQL Editor:
`update machines set active = false where code = 'washer_int_1';` (set it back to
`true` when it's fixed). The button greys out and the database refuses new
bookings on it. Existing bookings stay.

**Add a machine.** Write a migration with
`insert into machines (id, code, type, location) values (6, 'washer_int_3', 'washer', 'internal');`
then add `machines.washer_int_3` to both locale files.

**Change the database schema.** Always through a new file in
`supabase/migrations/` committed to the repo, never only in the dashboard. See
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#database-changes).

**Deploy.** Commit and `git push` to `master`. Vercel builds and publishes in
about a minute. Vercel only sees what's on GitHub, so a local commit alone
deploys nothing.

## Before launch

- The **privacy policy text** is still a placeholder (see `booking.consent` in the
  locale files). It must be written before the app is officially launched.
