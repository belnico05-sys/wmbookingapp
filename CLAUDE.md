# Gestionale prenotazioni lavatrici

Booking app for the shared washing machines of a student residence. It replaces
the paper sheet where students wrote their time slots. Primary users are
students on their phones; the app is shared via link/QR code.

## Tech stack

- **Frontend:** React + TypeScript + Vite, installable as a PWA (`vite-plugin-pwa`)
- **Styling:** Tailwind CSS, mobile-first (design for phone screens; desktop is secondary)
- **Backend:** Supabase free tier — Postgres + Realtime (`@supabase/supabase-js`)
- **i18n:** `react-i18next`, Italian (primary) + English
- **Hosting:** Vercel or Netlify free tier — to be confirmed at deploy time

## Commands

- `npm run dev -- --host` — dev server, reachable from phones on the same Wi-Fi
- `npm run build` / `npm run preview` — production build / local preview
- `npx supabase ...` — database work (see `.claude/skills/db`)
- `npm test` — Vitest unit tests (`src/**/*.test.ts`, timezone pinned to Europe/Rome)
- `npm run lint` — must be clean before committing

## Domain rules

- Entities: **machines** (configured per residence in the admin panel; the
  original residence has 2 internal washers, 1 external; 1 internal dryer,
  1 external), **time slots**, **bookings** (name, apartment number 1–N,
  machine, slot), **settings** (one row per residence).
- **No double booking**: one booking per machine per slot, enforced at the
  database level (unique/exclusion constraint), never only in the UI.
- 1-hour slots (fixed). Opening hours, booking window and apartment count
  are set by the manager in the admin panel (defaults 08:00–23:00, 30 days, 34).
- Cancellation: users can free a slot they booked themselves.

## Identification & privacy

- No accounts. A user identifies with **name + apartment number** only.
- A **consent checkbox is mandatory before saving any booking**: the user
  confirms the data is correct and accepts the privacy policy.
- The privacy policy text is **TBD — flag it before launch**.
- Never store or log personal data beyond name + apartment number. Exception,
  opt-in only: the browser push subscription of users who turn on notice-board
  notifications (table `push_subscriptions`, readable by no client, cleaned up
  about a day after the slot). The privacy policy must mention it.

## i18n rule

**No hardcoded UI strings.** Every user-facing string goes through
`react-i18next` keys. `src/locales/it.json` is the primary locale and
`src/locales/en.json` must be kept in sync (see `.claude/skills/i18n`).

## Code structure

Layers (details in `docs/ARCHITECTURE.md`): `pages → components/hooks → auth →
api → Supabase`. Only `src/api/` talks to Supabase. Per-residence settings
(apartments, hours, window, name) and machines come from the DB via
`useResidence()` (`src/residence/`), edited in the admin panel (`/#/admin`,
`components/admin/`). One deployment + Supabase project per residence. Only `src/auth/identity.ts`
knows who the user is / which bookings are theirs (it is the seam for the
planned university login, `docs/FUTURE-AUTH.md`). `src/lib/` is pure helpers.
Only slot length (`SLOT_MINUTES`) and timezone are still duplicated between
code and `create_booking` in SQL.
Keep `README.md` and `docs/` up to date when changing structure: the code is
meant to be handed over to other programmers.

## Conventions

- TypeScript strict mode.
- Supabase schema changes only via migration files committed to the repo —
  never only through the Supabase dashboard.
- Use the `db-reviewer` agent to review migrations and RLS policies.

## Environment

Windows 11 / PowerShell. Secrets live in `.env.local` (never committed):
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

## Interaction with the user

- When encountering any error that needs a manual fix (something that you can not do for any reason) during the development of the web app, ask the user (Nicola, the person that is developing the website app with u) to do it for you. Guide him through an explaination of how and where the error origined and the reason behind your inability to fix it yourself, then tell him what it needs to be solved and provide every necessary step to do so.
 