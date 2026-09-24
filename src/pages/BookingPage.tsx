import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { Machine } from '../lib/types'
import { firstSelectableDay, type Slot } from '../lib/slots'
import { myBookingIds } from '../auth/identity'
import { useDayBookings } from '../hooks/useDayBookings'
import { BrandHeader } from '../components/BrandHeader'
import { DatePicker } from '../components/DatePicker'
import { MachinePicker } from '../components/MachinePicker'
import { SlotList } from '../components/SlotList'
import { BookingModal } from '../components/BookingModal'
import { LanguageToggle } from '../components/LanguageToggle'

interface Props {
  machines: Machine[]
}

/** Home page: pick a day and a machine, then book a free slot. */
export function BookingPage({ machines }: Props) {
  const { t } = useTranslation()

  const [selectedDay, setSelectedDay] = useState<Date>(firstSelectableDay)
  const [selectedMachineId, setSelectedMachineId] = useState<number | null>(
    machines[0]?.id ?? null,
  )
  const [toBook, setToBook] = useState<Slot | null>(null)
  const { bookings, loadFailed, reload } = useDayBookings(selectedDay)

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
        {loadFailed && (
          <p className="mt-4 rounded-2xl bg-accent-100 p-3 text-sm font-medium text-accent-700 dark:bg-accent-700/20 dark:text-accent-100">
            {t('errors.loadFailed')}
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
              myBookingIds={myBookingIds()}
              onPick={setToBook}
            />
          )}
        </section>
      </main>

      {toBook && selectedMachine && (
        <BookingModal
          machine={selectedMachine}
          slot={toBook}
          onClose={() => setToBook(null)}
          onBooked={reload}
        />
      )}
    </div>
  )
}
