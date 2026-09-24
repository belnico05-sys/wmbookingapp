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
import { cancelBooking, createBooking, type NewBooking } from '../api/bookings'

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

/** Cancels one of the current user's bookings. Resolves false if it failed. */
export async function cancelMyBooking(id: string): Promise<boolean> {
  const stored = storedBookings().find((b) => b.id === id)
  if (!stored) return false
  const ok = await cancelBooking(id, stored.cancelToken)
  if (ok) writeStoredBookings(storedBookings().filter((b) => b.id !== id))
  return ok
}
