import { useCallback, useEffect, useState } from 'react'
import type { Booking } from '../lib/types'
import { fetchDayBookings, subscribeToBookingChanges } from '../api/bookings'

/**
 * The bookings of one day, kept up to date live: any change made by anyone
 * (Supabase Realtime) triggers a refetch. Call `reload()` to refetch manually.
 */
export function useDayBookings(day: Date) {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loadFailed, setLoadFailed] = useState(false)
  const [reloadTick, setReloadTick] = useState(0)
  const reload = useCallback(() => setReloadTick((n) => n + 1), [])

  useEffect(() => {
    // Ignore replies that arrive after the day changed (fast tapping).
    let stale = false
    fetchDayBookings(day).then(
      (data) => {
        if (stale) return
        setLoadFailed(false)
        setBookings(data)
      },
      () => {
        if (!stale) setLoadFailed(true)
      },
    )
    return () => {
      stale = true
    }
  }, [day, reloadTick])

  useEffect(() => subscribeToBookingChanges(reload), [reload])

  return { bookings, loadFailed, reload }
}
