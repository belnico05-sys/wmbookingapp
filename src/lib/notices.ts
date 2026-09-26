// Notice board rules, as seen by the app. The database function post_notice
// enforces the same ones (supabase/migrations/20260926120000_notices.sql).

import type { TFunction } from 'i18next'
import { SLOT_MINUTES } from './config'

export type NoticeKind = 'late' | 'early' | 'custom'

/** Max length of a free-text notice. */
export const NOTICE_MAX_LENGTH = 100

const MINUTE = 60_000

/** Posting is allowed from 1 hour before the slot starts until it ends. */
export function canPostNotice(slotStart: Date, now: Date = new Date()): boolean {
  const t = now.getTime()
  const start = slotStart.getTime()
  return t >= start - 60 * MINUTE && t <= start + SLOT_MINUTES * MINUTE
}

/** A notice stays on the board until 2 hours after its slot ends. */
export function isNoticeActive(slotStart: Date, now: Date = new Date()): boolean {
  return now.getTime() < slotStart.getTime() + (SLOT_MINUTES + 120) * MINUTE
}

/** A free-text message is valid once trimmed, from 1 to NOTICE_MAX_LENGTH characters. */
export function isValidNoticeMessage(text: string): boolean {
  const length = text.trim().length
  return length >= 1 && length <= NOTICE_MAX_LENGTH
}

export const NOTICE_ICON: Record<NoticeKind, string> = { late: '⏰', early: '✅', custom: '💬' }

/** What a notice says: the translated preset, or the user's own text in quotes. */
export function noticeText(t: TFunction, kind: NoticeKind, message: string | null): string {
  return kind === 'custom' ? `“${message ?? ''}”` : t(`notices.kinds.${kind}`)
}
