---
name: run
description: Launch the booking app dev server for testing, including from a phone on the same Wi-Fi. Use when asked to run, start, preview, or manually test the app.
---

# Running the app

## Prerequisites

- `npm install` has been run.
- `.env.local` exists in the project root with:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

  If it's missing, ask the user for the values from the Supabase dashboard
  (Project Settings → API). **Never commit this file.**

## Start the dev server

```powershell
npm run dev -- --host
```

Run it in the background and watch the output: Vite prints both a `Local:`
URL and a `Network:` URL. The **Network URL** (e.g. `http://192.168.x.x:5173`)
is what the user opens on their phone — phone and PC must be on the same Wi-Fi.

If no Network URL appears, get the LAN IP with `ipconfig` (look for the
Wi-Fi adapter's IPv4 address) and build the URL as `http://<ip>:5173`.

Tell the user both URLs when the server is up.

## Production preview

```powershell
npm run build; if ($?) { npm run preview -- --host }
```

Use this to test the real PWA behavior (service worker, install prompt) —
the dev server does not fully exercise the PWA plugin.
