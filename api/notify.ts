// Vercel serverless function: POST /api/notify { "noticeId": "<uuid>" }
//
// Sends the push notifications for one notice of the notice board. The
// browser that posted the notice calls this right after post_notice.
//
// Safe to call by anyone, any number of times: claim_notice_push (database)
// returns the targets only on the first call for a notice, and only
// subscriptions whose address belongs to a real push service can exist.
//
// Environment variables (Vercel → Project → Settings → Environment Variables):
//   VITE_SUPABASE_URL          same as the frontend
//   SUPABASE_SERVICE_ROLE_KEY  Supabase → Project Settings → API (secret!)
//   VITE_VAPID_PUBLIC_KEY      Web Push key pair (see README)
//   VAPID_PRIVATE_KEY          secret
//   VAPID_SUBJECT              the site's URL (or a mailto:), shown to push services
//
// Note: every file in api/ becomes an endpoint, so helpers stay in this file.

import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

interface Target {
  r_machine_type: 'washer' | 'dryer'
  r_machine_label: string
  r_machine_location: 'internal' | 'external'
  r_slot_start: string
  r_kind: 'late' | 'early' | 'custom'
  r_message: string | null
  r_endpoint: string
  r_p256dh: string
  r_auth: string
  r_lang: 'it' | 'en'
}

// The server has no i18next, so the few notification texts live here.
const TEXTS = {
  it: {
    washer: 'Lavatrice',
    dryer: 'Asciugatrice',
    internal: 'interna',
    external: 'esterna',
    late: 'Chi la usa prima di te finirà in ritardo.',
    early: 'Chi la usa prima di te ha finito prima: la macchina è libera.',
  },
  en: {
    washer: 'Washer',
    dryer: 'Dryer',
    internal: 'indoor',
    external: 'outdoor',
    late: 'The person before you will finish late.',
    early: 'The person before you finished early: the machine is free.',
  },
} as const

// Same allowlist as register_push in the database (defence in depth).
const PUSH_SERVICE =
  /^https:\/\/(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9.-]+\.push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com)\//
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function notification(t: Target) {
  const text = TEXTS[t.r_lang] ?? TEXTS.it
  const label = t.r_machine_label ? ` ${t.r_machine_label}` : ''
  const machine = `${text[t.r_machine_type]}${label} (${text[t.r_machine_location]})`
  const start = new Date(t.r_slot_start)
  const end = new Date(start.getTime() + 60 * 60 * 1000)
  const hhmm = (d: Date) =>
    d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' })
  return {
    title: `${machine} · ${hhmm(start)}–${hhmm(end)}`,
    body: t.r_kind === 'custom' ? `“${t.r_message ?? ''}”` : text[t.r_kind],
    url: '/',
  }
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

export async function POST(request: Request): Promise<Response> {
  const env = process.env
  if (!env.VITE_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY || !env.VITE_VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
    return json(500, { error: 'not_configured' })
  }

  const body = (await request.json().catch(() => null)) as { noticeId?: unknown } | null
  const noticeId = body?.noticeId
  if (typeof noticeId !== 'string' || !UUID.test(noticeId)) {
    return json(400, { error: 'bad_request' })
  }

  const db = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })
  const { data, error } = await db.rpc('claim_notice_push', { p_notice_id: noticeId })
  if (error) return json(500, { error: 'database' })
  const targets = (data ?? []) as Target[]

  webpush.setVapidDetails(
    env.VAPID_SUBJECT || 'https://example.com',
    env.VITE_VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY,
  )

  let sent = 0
  await Promise.all(
    targets
      .filter((t) => PUSH_SERVICE.test(t.r_endpoint))
      .map(async (t) => {
        try {
          await webpush.sendNotification(
            { endpoint: t.r_endpoint, keys: { p256dh: t.r_p256dh, auth: t.r_auth } },
            JSON.stringify(notification(t)),
            { TTL: 60 * 60 }, // pointless after an hour
          )
          sent++
        } catch (e) {
          // 404/410: the browser dropped this subscription; forget it.
          const status = (e as { statusCode?: number }).statusCode
          if (status === 404 || status === 410) {
            await db.from('push_subscriptions').delete().eq('endpoint', t.r_endpoint)
          }
        }
      }),
  )

  return json(200, { sent })
}
