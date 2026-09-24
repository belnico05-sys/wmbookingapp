// Booking rules, as seen by the app (what the calendar and slot list show).
//
// The database enforces the same rules inside the create_booking function.
// If you change a value here, ALSO write a new migration that updates
// create_booking — the latest definition is in
// supabase/migrations/20260615120000_extend_booking_window_30d.sql.

/** First slot starts at this local hour. */
export const FIRST_SLOT_HOUR = 8

/** Last slot starts at this local hour (ends one hour later, 23:00). */
export const LAST_SLOT_HOUR = 22

export const SLOT_MINUTES = 60

/** How many days ahead of today a slot can be booked (today + this many). */
export const WINDOW_DAYS = 30
