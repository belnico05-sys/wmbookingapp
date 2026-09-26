// Who the current user is, and which bookings are theirs.
//
// Today there are no accounts. The user's name + apartment are typed in the
// booking form and remembered on this device. "My bookings" are the bookings
// made from this device: each is stored in localStorage together with a
// secret cancel token, which is the only way to cancel it. Losing that
// storage (other phone, cleared browser data) means the booking can no longer
// be cancelled from the app; the slot simply expires.
//
// When university login arrives (see docs/FUTURE-AUTH.md) this is the file to
// replace: the rest of the app only uses the functions exported here, never
// localStorage or cancel tokens directly.

import { SLOT_MINUTES } from '../lib/config'
import {
  cancelBooking,
  createBooking,
  fetchExistingBookingIds,
  type NewBooking,
} from '../api/bookings'
import { postNotice, registerPush, requestPushSend } from '../api/notices'
import type { NoticeKind } from '../lib/notices'

export interface Profile {
  name: string
  apartment: string
}

/** A booking made by the current user. */
export interface MyBooking {
  id: string
  machineId: number
  slotStart: Date
}

// --- localStorage (keys and shapes must stay stable: users' tokens live here)

interface StoredBooking {
  id: string
  cancelToken: string
  machineId: number
  /** ISO timestamp */
  slotStart: string
}

const BOOKINGS_KEY = 'lavatrici.myBookings'
const PROFILE_KEY = 'lavatrici.profile'

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function storedBookings(): StoredBooking[] {
  return read<StoredBooking[]>(BOOKINGS_KEY, [])
}

function writeStoredBookings(all: StoredBooking[]): void {
  localStorage.setItem(BOOKINGS_KEY, JSON.stringify(all))
}

// --- Profile

/** The name + apartment last used on this device, to prefill the form. */
export function getProfile(): Profile | null {
  return read<Profile | null>(PROFILE_KEY, null)
}

// --- My bookings

/** IDs of all bookings that belong to the current user. */
export function myBookingIds(): Set<string> {
  return new Set(storedBookings().map((b) => b.id))
}

/** The current user's bookings whose slot has not ended yet, soonest first. */
export function myUpcomingBookings(): MyBooking[] {
  const now = Date.now()
  return storedBookings()
    .map((b) => ({ id: b.id, machineId: b.machineId, slotStart: new Date(b.slotStart) }))
    .filter((b) => b.slotStart.getTime() + SLOT_MINUTES * 60_000 > now)
    .sort((a, b) => a.slotStart.getTime() - b.slotStart.getTime())
}

/**
 * Books a slot for the current user and remembers it as theirs.
 * Throws a BookingError (from api/bookings) if the database refuses it.
 */
export async function createMyBooking(input: NewBooking): Promise<void> {
  const created = await createBooking(input)
  localStorage.setItem(
    PROFILE_KEY,
    JSON.stringify({ name: input.name.trim(), apartment: input.apartment.trim() }),
  )
  const others = storedBookings().filter((b) => b.id !== created.id)
  writeStoredBookings([
    ...others,
    {
      id: created.id,
      cancelToken: created.cancelToken,
      machineId: input.machineId,
      slotStart: input.slotStart.toISOString(),
    },
  ])
}

/**
 * Brings the remembered bookings in line with the database: forgets the ones
 * that no longer exist (deleted by the admin, or cancelled elsewhere) and the
 * ones whose slot ended more than a day ago. If the database can't be
 * reached, nothing is forgotten. Resolves true if something changed.
 */
export async function syncMyBookings(): Promise<boolean> {
  const dayAgo = Date.now() - 24 * 60 * 60_000
  const all = storedBookings()
  const recent = all.filter((b) => new Date(b.slotStart).getTime() > dayAgo)
  let existing: Set<string>
  try {
    existing = await fetchExistingBookingIds(recent.map((b) => b.id))
  } catch {
    return false
  }
  const checked = new Set(recent.map((b) => b.id))
  // Re-read: a booking made while the request was running must not be lost.
  const current = storedBookings()
  const kept = current.filter((b) => {
    if (new Date(b.slotStart).getTime() <= dayAgo) return false // long over
    if (checked.has(b.id)) return existing.has(b.id) // still in the database?
    return true // made while we were checking
  })
  if (kept.length === current.length) return false
  writeStoredBookings(kept)
  return true
}

/** Cancels one of the current user's bookings. Resolves false if it failed. */
export async function cancelMyBooking(id: string): Promise<boolean> {
  const stored = storedBookings().find((b) => b.id === id)
  if (!stored) return false
  const ok = await cancelBooking(id, stored.cancelToken)
  if (ok) writeStoredBookings(storedBookings().filter((b) => b.id !== id))
  return ok
}

// --- Notice board + notifications

/**
 * Posts a notice on one of the current user's bookings and asks the server
 * to notify the people booked after it. Throws a NoticeError if refused.
 */
export async function postMyNotice(
  bookingId: string,
  kind: NoticeKind,
  message: string | null,
): Promise<void> {
  const stored = storedBookings().find((b) => b.id === bookingId)
  if (!stored) throw new Error('not my booking')
  const noticeId = await postNotice(bookingId, stored.cancelToken, kind, message)
  requestPushSend(noticeId)
}

/**
 * Links this device's notification subscription to all the current user's
 * upcoming bookings, so they are notified about notices on earlier slots.
 */
export async function registerPushForMyBookings(
  subscription: PushSubscriptionJSON,
  lang: string,
): Promise<void> {
  const upcoming = new Set(myUpcomingBookings().map((b) => b.id))
  await Promise.all(
    storedBookings()
      .filter((b) => upcoming.has(b.id))
      .map((b) => registerPush(b.id, b.cancelToken, subscription, lang)),
  )
}
