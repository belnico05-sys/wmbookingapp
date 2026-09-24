// Booking rules.
//
// Opening hours and the booking window are set per residence in the admin
// panel (table `settings`) and reach the app through useResidence(). The
// database function create_booking enforces the same values.
//
// Slot length is fixed: changing it would break the alignment of existing
// bookings. If you ever change it, also change the '1 hour' checks in
// create_booking (latest: supabase/migrations/20260924120000_admin_settings.sql).

export const SLOT_MINUTES = 60

/** The per-residence rules the calendar and slot list need. */
export interface BookingRules {
  /** Local hour at which the first slot starts (e.g. 8). */
  firstSlotHour: number
  /** Local hour at which the last slot starts (e.g. 22, ending at 23:00). */
  lastSlotHour: number
  /** How many days ahead of today a slot can be booked (today + this many). */
  windowDays: number
}
