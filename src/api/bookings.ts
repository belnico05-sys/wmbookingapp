// Reading and writing bookings.
//
// The bookings table is read directly (it is public, like the paper sheet it
// replaces). Writes are only possible through two database functions (RPCs),
// create_booking and cancel_booking, which enforce the booking rules.
// See supabase/migrations/ and docs/ARCHITECTURE.md.

import type { Booking } from '../lib/types'
import { dayRange } from '../lib/slots'
import { db } from './client'

/** Error codes raised by create_booking; each has a message in errors.<code>. */
const BOOKING_ERROR_CODES = [
  'slot_taken',
  'consent_required',
  'apartment_invalid',
  'machine_not_available',
  'slot_not_aligned',
  'slot_out_of_hours',
  'slot_in_past',
  'slot_too_far_ahead',
] as const

/** A known create_booking error, or 'generic' for anything unexpected. */
export type BookingErrorCode = (typeof BOOKING_ERROR_CODES)[number] | 'generic'

export class BookingError extends Error {
  readonly code: BookingErrorCode

  constructor(code: BookingErrorCode) {
    super(code)
    this.code = code
  }
}

interface BookingRow {
  id: string
  machine_id: number
  slot_start: string
  name: string
  apartment: string
  note: string | null
}

function toBooking(row: BookingRow): Booking {
  return {
    id: row.id,
    machineId: row.machine_id,
    slotStart: new Date(row.slot_start),
    name: row.name,
    apartment: row.apartment,
    note: row.note,
  }
}

/** All bookings (every machine) of one local day. Throws if the request fails. */
export async function fetchDayBookings(day: Date): Promise<Booking[]> {
  const { from, to } = dayRange(day)
  const { data, error } = await db()
    .from('bookings')
    .select('id, machine_id, slot_start, name, apartment, note')
    .gte('slot_start', from.toISOString())
    .lt('slot_start', to.toISOString())
  if (error) throw error
  return (data as BookingRow[]).map(toBooking)
}

/** All bookings from today onwards (every machine), soonest first. Throws on failure. */
export async function fetchUpcomingBookings(): Promise<Booking[]> {
  const { from } = dayRange(new Date())
  const { data, error } = await db()
    .from('bookings')
    .select('id, machine_id, slot_start, name, apartment, note')
    .gte('slot_start', from.toISOString())
    .order('slot_start')
  if (error) throw error
  return (data as BookingRow[]).map(toBooking)
}

/**
 * Which of the given booking ids still exist (e.g. not deleted by the admin).
 * Throws on failure, so callers never mistake "offline" for "deleted".
 */
export async function fetchExistingBookingIds(ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set()
  const { data, error } = await db().from('bookings').select('id').in('id', ids)
  if (error) throw error
  return new Set((data as { id: string }[]).map((row) => row.id))
}

export interface NewBooking {
  machineId: number
  slotStart: Date
  name: string
  apartment: string
  note: string | null
  /** The mandatory privacy checkbox. The database rejects false. */
  consent: boolean
}

export interface CreatedBooking {
  id: string
  /** Secret that allows cancelling this booking later. */
  cancelToken: string
}

/** Creates a booking. Throws a BookingError if the database refuses it. */
export async function createBooking(input: NewBooking): Promise<CreatedBooking> {
  const { data, error } = await db().rpc('create_booking', {
    p_machine_id: input.machineId,
    p_slot_start: input.slotStart.toISOString(),
    p_name: input.name,
    p_apartment: input.apartment,
    p_consent: input.consent,
    p_note: input.note,
  })
  if (error) {
    // The RPC raises the code as the exception message, e.g. 'slot_taken'.
    const known = BOOKING_ERROR_CODES.find((code) => code === error.message?.trim())
    throw new BookingError(known ?? 'generic')
  }
  const row = Array.isArray(data) ? data[0] : data
  return { id: row.booking_id, cancelToken: row.cancel_token }
}

/** Deletes a booking if the token matches. Resolves false if nothing was deleted. */
export async function cancelBooking(id: string, cancelToken: string): Promise<boolean> {
  const { data, error } = await db().rpc('cancel_booking', {
    p_booking_id: id,
    p_cancel_token: cancelToken,
  })
  return !error && data === true
}

let channelCount = 0

/**
 * Calls onChange whenever any booking is created or deleted (Supabase
 * Realtime). Returns the function that stops listening.
 */
export function subscribeToBookingChanges(onChange: () => void): () => void {
  // A unique name per subscription: two screens may listen at the same time.
  const channel = db()
    .channel(`bookings-changes-${++channelCount}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, onChange)
    .subscribe()
  return () => {
    db().removeChannel(channel)
  }
}
