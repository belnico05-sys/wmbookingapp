import { useCallback, useEffect, useState } from 'react'
import { myUpcomingBookings, syncMyBookings, type MyBooking } from '../auth/identity'
import { subscribeToBookingChanges } from '../api/bookings'

/**
 * The current user's upcoming bookings. Shown from this device's memory
 * right away, then checked against the database on open and after every
 * change to bookings (Realtime), so bookings deleted elsewhere (e.g. by the
 * admin) disappear.
 */
export function useMyBookings() {
  const [list, setList] = useState<MyBooking[]>(myUpcomingBookings)
  const refresh = useCallback(() => setList(myUpcomingBookings()), [])

  useEffect(() => {
    const sync = () => {
      syncMyBookings().then((changed) => {
        if (changed) refresh()
      })
    }
    sync()
    return subscribeToBookingChanges(sync)
  }, [refresh])

  return { list, refresh }
}
