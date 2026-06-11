// Bookings made from this device, with their secret cancel tokens.
// Losing this storage means the booking can no longer be cancelled from
// the app (MVP limitation) — the slot simply expires.

export interface MyBooking {
  id: string
  cancelToken: string
  machineId: number
  /** ISO timestamp */
  slotStart: string
}

export interface Profile {
  name: string
  apartment: string
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

export function getMyBookings(): MyBooking[] {
  return read<MyBooking[]>(BOOKINGS_KEY, [])
}

export function addMyBooking(booking: MyBooking): void {
  const all = getMyBookings().filter((b) => b.id !== booking.id)
  all.push(booking)
  localStorage.setItem(BOOKINGS_KEY, JSON.stringify(all))
}

export function removeMyBooking(id: string): void {
  const all = getMyBookings().filter((b) => b.id !== id)
  localStorage.setItem(BOOKINGS_KEY, JSON.stringify(all))
}

export function getProfile(): Profile | null {
  return read<Profile | null>(PROFILE_KEY, null)
}

export function saveProfile(profile: Profile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
}
