// The notice board ("Bacheca") and push notification subscriptions.
//
// Notices are readable by everyone while the admin has the feature on.
// Posting and subscribing go through database functions that check the
// booking's cancel token (see supabase/migrations/20260926120000_notices.sql).
// The notifications themselves are sent by the server function api/notify.ts.

import type { Notice } from '../lib/types'
import type { NoticeKind } from '../lib/notices'
import { SLOT_MINUTES } from '../lib/config'
import { db } from './client'

/** Error codes raised by post_notice; each has a message in notices.errors.<code>. */
const NOTICE_ERROR_CODES = [
  'notices_disabled',
  'not_your_booking',
  'notice_too_early',
  'notice_too_late',
  'notice_limit',
  'notice_invalid',
] as const

export type NoticeErrorCode = (typeof NOTICE_ERROR_CODES)[number] | 'generic'

export class NoticeError extends Error {
  readonly code: NoticeErrorCode

  constructor(code: NoticeErrorCode) {
    super(code)
    this.code = code
  }
}

interface NoticeRow {
  id: string
  kind: NoticeKind
  message: string | null
  created_at: string
  booking: { id: string; machine_id: number; slot_start: string; name: string }
}

/**
 * Notices still on the board: their slot ended less than 2 hours ago
 * (see isNoticeActive), newest first. Empty while the feature is off.
 */
export async function fetchActiveNotices(): Promise<Notice[]> {
  const since = new Date(Date.now() - (SLOT_MINUTES + 120) * 60_000)
  const { data, error } = await db()
    .from('notices')
    .select('id, kind, message, created_at, booking:bookings!inner(id, machine_id, slot_start, name)')
    .gt('booking.slot_start', since.toISOString())
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as unknown as NoticeRow[]).map((row) => ({
    id: row.id,
    kind: row.kind,
    message: row.message,
    createdAt: new Date(row.created_at),
    bookingId: row.booking.id,
    machineId: row.booking.machine_id,
    slotStart: new Date(row.booking.slot_start),
    name: row.booking.name,
  }))
}

/** Posts a notice on a booking. Throws a NoticeError if the database refuses it. */
export async function postNotice(
  bookingId: string,
  cancelToken: string,
  kind: NoticeKind,
  message: string | null,
): Promise<string> {
  const { data, error } = await db().rpc('post_notice', {
    p_booking_id: bookingId,
    p_cancel_token: cancelToken,
    p_kind: kind,
    p_message: message,
  })
  if (error) {
    const known = NOTICE_ERROR_CODES.find((code) => code === error.message?.trim())
    throw new NoticeError(known ?? 'generic')
  }
  return data as string
}

/**
 * Asks the server to send the push notifications for a notice. Fire and
 * forget: the notice is already on the board even if this fails.
 */
export function requestPushSend(noticeId: string): void {
  fetch('/api/notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ noticeId }),
    keepalive: true,
  }).catch(() => {})
}

/** Links this browser's push subscription to one booking. Resolves false on failure. */
export async function registerPush(
  bookingId: string,
  cancelToken: string,
  subscription: PushSubscriptionJSON,
  lang: string,
): Promise<boolean> {
  const { error } = await db().rpc('register_push', {
    p_booking_id: bookingId,
    p_cancel_token: cancelToken,
    p_endpoint: subscription.endpoint,
    p_p256dh: subscription.keys?.p256dh,
    p_auth: subscription.keys?.auth,
    p_lang: lang.startsWith('en') ? 'en' : 'it',
  })
  return !error
}

/** Calls onChange whenever a notice is posted or deleted. Returns the unsubscribe function. */
export function subscribeToNoticeChanges(onChange: () => void): () => void {
  const channel = db()
    .channel('notices-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notices' }, onChange)
    .subscribe()
  return () => {
    db().removeChannel(channel)
  }
}
