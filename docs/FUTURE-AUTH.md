# Future: university login

**Status: not built. This is the plan, so the work can start from here.**

## Why

Today anyone with the link can book under any name, and the schedule (names +
apartment numbers) is visible to anyone. Cancelling only works from the phone
that booked. Requiring students to sign in with their university account fixes
all three problems.

## Step 1: find out what the university offers

This choice decides the cost and the effort. Ask the university IT / DSU which
of these students can use:

| Login system                                          | How with Supabase                                   | Cost                   |
| ----------------------------------------------------- | --------------------------------------------------- | ---------------------- |
| **Microsoft 365** (student email on Outlook/Teams)    | Built-in "Azure" OAuth provider                     | Free tier OK           |
| **Google Workspace** (student email on Gmail)         | Built-in "Google" OAuth provider, restrict domain   | Free tier OK           |
| **SAML / Shibboleth** (IDEM federation, uni SSO page) | Supabase SAML SSO                                   | **Paid (Pro plan)**    |
| **SPID / CIE**                                        | Needs an external identity broker                   | Paid broker + paperwork |

Registering the app with the university (redirect URL, client ID/secret) usually
needs a request to their IT office. Allow time for that.

Microsoft or Google is by far the cheapest route. With those, only accept emails from the
university's domain (e.g. `@studenti.unipi.it`).

## Step 2: database (one migration)

- `bookings.user_id uuid references auth.users` (nullable at first, so existing
  bookings keep working).
- `create_booking`: require `auth.uid() is not null`, store it in `user_id`. Name
  can come from the login profile, and apartment is still asked (or stored once
  in a `profiles` table).
- `cancel_booking`: allow when `user_id = auth.uid()`. Keep the token path until
  the old token-based bookings have expired, then drop it together with
  `booking_secrets`.
- RLS: grant read on `bookings` to `authenticated` only (hides names from
  outsiders). Revoke `execute` on both functions from `anon`.

## Step 3: frontend

The code is already arranged for this:

- **`src/auth/identity.ts`** is the only file that knows who the user is and which
  bookings are theirs. Reimplement its exports on top of the Supabase session:
  - `getProfile()` → from the session / `profiles` table
  - `myBookingIds()` / `myUpcomingBookings()` → query `bookings where user_id = me`
    (these become async, so update their few callers)
  - `createMyBooking()` / `cancelMyBooking()` → call the RPCs without tokens
- **`src/App.tsx`**: add a login gate around the student routes (sign-in screen with
  the university button, `supabase.auth.signInWithOAuth`). The admin panel's
  session handling (`api/admin.ts`, `hooks/useAdminSession.ts`) is a working example.
- **`BookingModal`**: prefill the name from the account and drop the "device only"
  hints in the locale files.
- Components, hooks and `api/` don't otherwise need changes.

## Admins

The admin panel already uses Supabase Auth (email + password for the manager)
and an `admins` table checked by `is_admin()`. That keeps working unchanged
when students sign in too: a student is just a signed-in user **without** a row
in `admins`. The manager could then also sign in through the university; you'd
simply add their user id to `admins`. Even when students can sign in, keep public
email/password sign-ups off: only the university provider should create accounts.

## Notice board

`postMyNotice` and `registerPushForMyBookings` in `auth/identity.ts` use the
cancel token today. With login, `post_notice` and `register_push` should check
`auth.uid()` against `bookings.user_id` instead, and a push subscription can be
linked to the user rather than to each booking (then notifications work on every
device the student signed in on).

## Privacy

The privacy policy must say what the login provides (email, name) and that
only name + apartment are stored with bookings, plus the push subscriptions of
users who turn on notifications. Update it before switching on login.
