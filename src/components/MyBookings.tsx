import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SLOT_MINUTES } from '../lib/config'
import { myUpcomingBookings, type MyBooking } from '../auth/identity'
import { formatDayLong, formatTime } from '../lib/format'
import { machineName } from '../lib/machines'
import { useResidence } from '../residence/useResidence'
import { CancelBookingSheet } from './CancelBookingSheet'

/** List of the user's upcoming bookings, each with a cancel button. */
export function MyBookings() {
  const { t, i18n } = useTranslation()
  const { machines } = useResidence()
  const [list, setList] = useState<MyBooking[]>(myUpcomingBookings)
  const [toCancel, setToCancel] = useState<MyBooking | null>(null)

  return (
    <section className="mt-8">
      <h2 className="text-base font-bold text-brand-900 dark:text-slate-100">
        {t('myBookings.title')}
      </h2>
      {list.length === 0 ? (
        <p className="mt-2 text-sm text-brand-400 dark:text-slate-400">
          {t('myBookings.empty')}
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {list.map((b) => {
            const end = new Date(b.slotStart.getTime() + SLOT_MINUTES * 60_000)
            const machine = machines.find((m) => m.id === b.machineId)
            return (
              <li
                key={b.id}
                className="flex items-center justify-between gap-3 rounded-2xl bg-white p-3.5 text-sm ring-1 ring-brand-100 dark:bg-white/[0.06] dark:ring-white/10"
              >
                <span className="text-brand-900 dark:text-slate-100">
                  <span className="font-semibold">
                    {machine ? machineName(t, machine) : `#${b.machineId}`}
                  </span>
                  <br />
                  <span className="text-brand-600 dark:text-slate-300">
                    {formatDayLong(b.slotStart, i18n.language)} ·{' '}
                    {formatTime(b.slotStart, i18n.language)}–{formatTime(end, i18n.language)}
                  </span>
                </span>
                <button
                  className="shrink-0 rounded-full px-3.5 py-1.5 font-semibold text-accent-600 ring-1 ring-accent-600/40 transition hover:bg-accent-600 hover:text-white dark:text-accent-100 dark:ring-accent-100/30"
                  onClick={() => setToCancel(b)}
                >
                  {t('myBookings.cancel')}
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <p className="mt-3 text-xs text-brand-400 dark:text-slate-500">
        {t('myBookings.deviceHint')}
      </p>

      {toCancel && (
        <CancelBookingSheet
          booking={toCancel}
          machine={machines.find((m) => m.id === toCancel.machineId)}
          onClose={() => setToCancel(null)}
          onCancelled={() => setList(myUpcomingBookings())}
        />
      )}
    </section>
  )
}
