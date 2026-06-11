---
name: db
description: Supabase database workflow — creating and applying schema migrations, where constraints and RLS policies live. Use for any schema change, new table, or policy work.
---

# Database workflow (Supabase)

The schema lives in `supabase/migrations/` as SQL files committed to the repo.
**Never make schema changes only in the Supabase dashboard** — they would be
lost and unreviewable.

## Creating a migration

```powershell
npx supabase migration new <short_snake_case_name>
```

This creates `supabase/migrations/<timestamp>_<name>.sql`. Write the SQL there.

## Applying migrations

- To the hosted project (requires `npx supabase login` and
  `npx supabase link --project-ref <ref>` once):

  ```powershell
  npx supabase db push
  ```

- If the user has Docker and wants a local database:
  `npx supabase start` then `npx supabase db reset` (re-runs all migrations).
  Don't assume Docker is available — ask first.

## Rules for every migration

- **Booking integrity:** the no-double-booking rule is enforced here — a
  unique constraint on `(machine_id, slot)` (or an exclusion constraint on a
  time range). Any change to bookings must preserve it.
- **RLS:** Row Level Security must be enabled on every table holding personal
  data (name, apartment number). Anonymous users may insert bookings and
  read the schedule, but updates/deletes must be restricted (e.g. via a
  per-booking secret/token), not open to everyone.
- **Destructive changes** (`DROP`, column removal, data rewrites) need an
  explicit comment in the migration explaining why, and a note to the user
  before applying to the hosted project.
- After writing a migration, have the `db-reviewer` agent check it.
