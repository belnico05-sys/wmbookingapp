// Domain types used across the app. The api layer (src/api/) converts
// database rows (snake_case columns) into these, so components never deal
// with column names.

import type { BookingRules } from './config'

export interface Machine {
  id: number
  /** Stable internal identifier (e.g. washer_int_1). Not shown to users. */
  code: string
  type: 'washer' | 'dryer'
  location: 'internal' | 'external'
  /** Short distinguishing label, e.g. "1" → "Washer 1 (indoor)". May be empty. */
  label: string
  /** false = under maintenance: shown greyed out, cannot be booked. */
  active: boolean
  /** true = removed from the residence: hidden everywhere except the admin panel. */
  retired: boolean
}

/** A booking as shown on the public schedule. */
export interface Booking {
  id: string
  machineId: number
  slotStart: Date
  name: string
  apartment: string
  note: string | null
}

/** Everything the admin configures for this residence (table `settings`). */
export interface ResidenceSettings extends BookingRules {
  /** Shown in the header; empty = not shown. */
  residenceName: string
  /** Valid apartments are 1 … apartmentCount. */
  apartmentCount: number
}
