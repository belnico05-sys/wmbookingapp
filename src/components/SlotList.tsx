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
              className={`rounded-lg border p-3 text-sm ${
                mine ? 'border-sky-600 bg-sky-50' : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{range}</span>
                <span className={mine ? 'text-sky-700' : 'text-gray-600'}>
                  {mine
                    ? t('slots.yours')
                    : t('slots.bookedBy', {
                        name: booking.name,
                        apartment: booking.apartment,
                      })}
                </span>
              </div>
              {booking.note && (
                <p className="mt-1 text-gray-500">
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
              className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white p-3 text-sm disabled:opacity-40"
            >
              <span className="font-medium">{range}</span>
              <span className="text-gray-500">
                {over ? t('slots.over') : t('slots.free')}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
