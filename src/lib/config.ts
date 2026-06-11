// Booking rules — keep in sync with the checks in
// supabase/migrations/*_init.sql (create_booking).

/** First slot starts at this local hour. */
export const FIRST_SLOT_HOUR = 8

/** Last slot starts at this local hour (ends one hour later, 23:00). */
export const LAST_SLOT_HOUR = 22

export const SLOT_MINUTES = 60

/** How many days ahead a slot can be booked. */
export const WINDOW_DAYS = 14
