import { useTranslation } from 'react-i18next'
import type { Booking, Machine } from '../lib/types'
import { slotsForDay, isSlotOver, type Slot } from '../lib/slots'
import { formatTime } from '../lib/format'

interface Props {
  machine: Machine
  day: Date
  bookings: Booking[]
  myBookingIds: Set<string>
  onPick: (slot: Slot) => void
}

export function SlotList({ machine, day, bookings, myBookingIds, onPick }: Props) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language

  // Index this machine's bookings by slot-start timestamp for quick lookup.
  const byStart = new Map<number, Booking>()
  for (const b of bookings) {
    if (b.machine_id === machine.id) {
      byStart.set(new Date(b.slot_start).getTime(), b)
    }
  }

  return (
    <ul className="flex flex-col gap-2">
      {slotsForDay(day).map((slot) => {
        const booking = byStart.get(slot.start.getTime())
        const over = isSlotOver(slot)
        const mine = booking ? myBookingIds.has(booking.id) : false
        const range = t('slots.range', {
          start: formatTime(slot.start, lang),
          end: formatTime(slot.end, lang),
        })

        if (booking) {
          return (
            <li
              key={slot.start.toISOString()}
              className={`rounded-2xl p-3.5 text-sm ring-1 ${
                mine
                  ? 'bg-brand-50 ring-brand-300 dark:bg-brand-900/40 dark:ring-brand-700'
                  : 'bg-white ring-brand-100 dark:bg-brand-900/20 dark:ring-brand-800'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-brand-900 dark:text-brand-100">
                  {range}
                </span>
                {mine ? (
                  <span className="rounded-full bg-brand-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                    {t('slots.yours')}
                  </span>
                ) : (
                  <span className="text-right text-brand-700 dark:text-brand-200">
                    {t('slots.bookedBy', {
                      name: booking.name,
                      apartment: booking.apartment,
                    })}
                  </span>
                )}
              </div>
              {booking.note && (
                <p className="mt-1.5 rounded-lg bg-brand-100/60 px-2 py-1 text-xs text-brand-700 dark:bg-brand-800/40 dark:text-brand-200">
                  {t('slots.note', { note: booking.note })}
                </p>
              )}
            </li>
          )
        }

        return (
          <li key={slot.start.toISOString()}>
            <button
              disabled={over}
              onClick={() => onPick(slot)}
              className={`flex w-full items-center justify-between rounded-2xl p-3.5 text-sm transition ${
                over
                  ? 'cursor-not-allowed bg-transparent text-brand-300 ring-1 ring-brand-100 dark:text-brand-700 dark:ring-brand-900'
                  : 'bg-white text-brand-900 ring-1 ring-emerald-200 hover:bg-emerald-50 hover:ring-emerald-400 dark:bg-brand-900/20 dark:text-brand-100 dark:ring-emerald-900 dark:hover:bg-emerald-950/30'
              }`}
            >
              <span className="font-bold">{range}</span>
              {over ? (
                <span className="text-xs uppercase tracking-wide">
                  {t('slots.over')}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                  {t('slots.free')}
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-base leading-none text-white">
                    +
                  </span>
                </span>
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
