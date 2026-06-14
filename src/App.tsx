import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Booking, Machine } from './lib/types'
import { isSupabaseConfigured, db } from './lib/supabase'
import { bookableDays, dayRange, type Slot } from './lib/slots'
import { getMyBookings } from './lib/myBookings'
import { DayPicker } from './components/DayPicker'
import { MachinePicker } from './components/MachinePicker'
import { SlotList } from './components/SlotList'
import { BookingModal } from './components/BookingModal'
import { MyBookings } from './components/MyBookings'
import { LanguageToggle } from './components/LanguageToggle'

export default function App() {
  const { t } = useTranslation()

  if (!isSupabaseConfigured) {
    return (
      <main className="mx-auto max-w-md p-6">
        <h1 className="text-xl font-semibold">{t('app.title')}</h1>
        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          {t('setup.notConfigured')}
        </p>
      </main>
    )
  }

  return <BookingApp />
}

function BookingApp() {
  const { t } = useTranslation()
  const days = useMemo(() => bookableDays(), [])

  const [machines, setMachines] = useState<Machine[]>([])
  const [selectedDay, setSelectedDay] = useState<Date>(days[0])
  const [selectedMachineId, setSelectedMachineId] = useState<number | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [picked, setPicked] = useState<Slot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [myReloadKey, setMyReloadKey] = useState(0)

  const myBookingIds = useMemo(
    () => new Set(getMyBookings().map((b) => b.id)),
    [myReloadKey, bookings],
  )

  // Load the machine list once.
  useEffect(() => {
    db()
      .from('machines')
      .select('*')
      .order('id')
      .then(({ data, error }) => {
        if (error) {
          setError(t('errors.loadFailed'))
          return
        }
        setMachines(data as Machine[])
        if (data && data.length > 0) setSelectedMachineId((id) => id ?? data[0].id)
      })
  }, [t])

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

  // Refetch the visible day whenever it changes.
  useEffect(() => {
    loadBookings()
  }, [loadBookings])

  // Realtime: any change to bookings refreshes the visible day. The payload
  // is only a trigger — we re-query to stay consistent with our filters.
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
    <main className="mx-auto max-w-md p-4">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">{t('app.title')}</h1>
          <p className="text-sm text-gray-500">{t('app.subtitle')}</p>
        </div>
        <LanguageToggle />
      </header>

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>
      )}

      <div className="mt-4">
        <DayPicker days={days} selected={selectedDay} onSelect={setSelectedDay} />
      </div>

      <div className="mt-4">
        <MachinePicker
          machines={machines}
          selectedId={selectedMachineId}
          onSelect={setSelectedMachineId}
        />
      </div>

      <div className="mt-4">
        {selectedMachine && (
          <SlotList
            machine={selectedMachine}
            day={selectedDay}
            bookings={bookings}
            myBookingIds={myBookingIds}
            onPick={setPicked}
          />
        )}
      </div>

      <MyBookings
        machines={machines}
        reloadKey={myReloadKey}
        onChanged={() => {
          setMyReloadKey((k) => k + 1)
          loadBookings()
        }}
      />

      {picked && selectedMachine && (
        <BookingModal
          machine={selectedMachine}
          slot={picked}
          onClose={() => setPicked(null)}
          onBooked={() => {
            setPicked(null)
            setMyReloadKey((k) => k + 1)
            loadBookings()
          }}
        />
      )}
    </main>
  )
}
