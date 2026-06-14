import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { Booking, Machine } from '../lib/types'
import { db } from '../lib/supabase'
import { dayRange, firstSelectableDay, type Slot } from '../lib/slots'
import { getMyBookings } from '../lib/myBookings'
import { BrandHeader } from '../components/BrandHeader'
import { DatePicker } from '../components/DatePicker'
import { MachinePicker } from '../components/MachinePicker'
import { SlotList } from '../components/SlotList'
import { BookingModal } from '../components/BookingModal'
import { LanguageToggle } from '../components/LanguageToggle'

interface Props {
  machines: Machine[]
}

export function BookingPage({ machines }: Props) {
  const { t } = useTranslation()

  const [selectedDay, setSelectedDay] = useState<Date>(firstSelectableDay())
  const [selectedMachineId, setSelectedMachineId] = useState<number | null>(
    machines[0]?.id ?? null,
  )
  const [bookings, setBookings] = useState<Booking[]>([])
  const [picked, setPicked] = useState<Slot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [myKey, setMyKey] = useState(0)

  const myBookingIds = useMemo(
    () => new Set(getMyBookings().map((b) => b.id)),
    [myKey, bookings],
  )

  const loadBookings = useCallback(async () => {
    const { from, to } = dayRange(selectedDay)
    const { data, error } = await db()
      .from('bookings')
      .select('id, machine_id, slot_start, name, apartment, note')
      .gte('slot_start', from.toISOString())
      .lt('slot_start', to.toISOString())
    if (error) {
      setError(t('errors.loadFailed'))
      return
    }
    setError(null)
    setBookings(data as Booking[])
  }, [selectedDay, t])

  useEffect(() => {
    loadBookings()
  }, [loadBookings])

  // Realtime: any change to bookings refreshes the visible day.
  useEffect(() => {
    const channel = db()
      .channel('bookings-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => loadBookings(),
      )
      .subscribe()
    return () => {
      db().removeChannel(channel)
    }
  }, [loadBookings])

  const selectedMachine = machines.find((m) => m.id === selectedMachineId) ?? null

  return (
    <div className="min-h-screen pb-12">
      <BrandHeader
        right={
          <>
            <Link
              to="/prenotazioni"
              aria-label={t('nav.myBookings')}
              title={t('nav.myBookings')}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-lg transition hover:bg-white/25"
            >
              <span aria-hidden="true">📋</span>
            </Link>
            <LanguageToggle />
          </>
        }
      />

      <main className="mx-auto max-w-md px-4">
        {error && (
          <p className="mt-4 rounded-2xl bg-accent-100 p-3 text-sm font-medium text-accent-700 dark:bg-accent-700/20 dark:text-accent-100">
            {error}
          </p>
        )}

        <section className="mt-5">
          <DatePicker selected={selectedDay} onSelect={setSelectedDay} />
        </section>

        <section className="mt-4">
          <MachinePicker
            machines={machines}
            selectedId={selectedMachineId}
            onSelect={setSelectedMachineId}
          />
        </section>

        <section className="mt-5">
          {selectedMachine && (
            <SlotList
              machine={selectedMachine}
              day={selectedDay}
              bookings={bookings}
              myBookingIds={myBookingIds}
              onPick={setPicked}
            />
          )}
        </section>
      </main>

      {picked && selectedMachine && (
        <BookingModal
          machine={selectedMachine}
          slot={picked}
          onClose={() => setPicked(null)}
          onBooked={() => {
            setMyKey((k) => k + 1)
            loadBookings()
          }}
        />
      )}
    </div>
  )
}
