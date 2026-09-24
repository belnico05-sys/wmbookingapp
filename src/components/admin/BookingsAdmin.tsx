import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Booking, Machine } from '../../lib/types'
import { SLOT_MINUTES } from '../../lib/config'
import { formatDayLong, formatTime } from '../../lib/format'
import { machineName } from '../../lib/machines'
import { fetchUpcomingBookings } from '../../api/bookings'
import { deleteBooking } from '../../api/admin'
import { Sheet } from '../ui/Sheet'
import { SlotPill } from '../SlotPill'
import {
  cardClass,
  dangerButtonClass,
  errorBoxClass,
  secondaryButtonClass,
} from '../ui/styles'

interface Props {
  /** All machines, retired ones included (to name every booking). */
  machines: Machine[]
}

/** Every upcoming booking, grouped by day, each with a delete button. */
export function BookingsAdmin({ machines }: Props) {
  const { t, i18n } = useTranslation()
  const [bookings, setBookings] = useState<Booking[] | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [reloadTick, setReloadTick] = useState(0)
  const [toDelete, setToDelete] = useState<Booking | null>(null)

  useEffect(() => {
    fetchUpcomingBookings().then(
      (data) => {
        setLoadFailed(false)
        setBookings(data)
      },
      () => setLoadFailed(true),
    )
  }, [reloadTick])

  const reload = () => setReloadTick((n) => n + 1)
  const name = (id: number) => {
    const m = machines.find((x) => x.id === id)
    return m ? machineName(t, m) : `#${id}`
  }

  // Group by local day, keeping the chronological order from the query.
  const days = new Map<string, Booking[]>()
  for (const b of bookings ?? []) {
    const key = b.slotStart.toDateString()
    days.set(key, [...(days.get(key) ?? []), b])
  }

  return (
    <section className={`flex flex-col gap-3 ${cardClass}`}>
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-brand-900 dark:text-slate-100">{t('admin.bookings.title')}</h3>
        <button
          onClick={reload}
          className="rounded-full px-3 py-1.5 text-xs font-semibold text-brand-600 ring-1 ring-brand-200 transition hover:bg-brand-50 dark:text-slate-300 dark:ring-white/15"
        >
          {t('admin.bookings.refresh')}
        </button>
      </div>

      {loadFailed && <p className={errorBoxClass}>{t('errors.loadFailed')}</p>}
      {bookings?.length === 0 && (
        <p className="text-sm text-brand-400 dark:text-slate-400">{t('admin.bookings.empty')}</p>
      )}

      {[...days.values()].map((list) => (
        <div key={list[0].slotStart.toDateString()}>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-brand-400 dark:text-slate-400">
            {formatDayLong(list[0].slotStart, i18n.language)}
          </p>
          <ul className="flex flex-col gap-1.5">
            {list.map((b) => {
              const end = new Date(b.slotStart.getTime() + SLOT_MINUTES * 60_000)
              return (
                <li
                  key={b.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-brand-50 p-2.5 text-sm ring-1 ring-brand-100 dark:bg-white/[0.04] dark:ring-white/10"
                >
                  <span className="min-w-0 text-brand-900 dark:text-slate-100">
                    <span className="font-semibold">
                      {formatTime(b.slotStart, i18n.language)}–{formatTime(end, i18n.language)}
                    </span>{' '}
                    · {name(b.machineId)}
                    <br />
                    <span className="text-brand-600 dark:text-slate-300">
                      {t('slots.bookedBy', { name: b.name, apartment: b.apartment })}
                    </span>
                    {b.note && (
                      <span className="block text-xs text-brand-500 dark:text-slate-400">
                        {t('slots.note', { note: b.note })}
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => setToDelete(b)}
                    className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold text-accent-600 ring-1 ring-accent-600/40 transition hover:bg-accent-600 hover:text-white dark:text-accent-100 dark:ring-accent-100/30"
                  >
                    {t('admin.bookings.delete')}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ))}

      {toDelete && (
        <DeleteBookingSheet
          booking={toDelete}
          machine={name(toDelete.machineId)}
          onClose={() => setToDelete(null)}
          onDeleted={reload}
        />
      )}
    </section>
  )
}

interface SheetProps {
  booking: Booking
  machine: string
  onClose: () => void
  onDeleted: () => void
}

function DeleteBookingSheet({ booking, machine, onClose, onDeleted }: SheetProps) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  async function confirm() {
    setBusy(true)
    setFailed(false)
    try {
      await deleteBooking(booking.id)
      onDeleted()
      onClose()
    } catch {
      setFailed(true)
      setBusy(false)
    }
  }

  return (
    <Sheet onClose={onClose}>
      <h2 className="text-lg font-bold text-brand-900 dark:text-slate-100">
        {t('admin.bookings.confirmTitle')}
      </h2>
      <p className="mt-1 text-sm font-semibold text-brand-700 dark:text-slate-300">{machine}</p>
      <SlotPill start={booking.slotStart} />
      <p className="mt-3 text-sm text-brand-700 dark:text-slate-300">
        {t('slots.bookedBy', { name: booking.name, apartment: booking.apartment })}
      </p>
      <p className="mt-1 text-xs text-brand-400 dark:text-slate-400">{t('admin.bookings.confirmHint')}</p>

      {failed && <p className={`mt-4 ${errorBoxClass}`}>{t('admin.saveFailed')}</p>}

      <div className="mt-5 flex gap-2.5">
        <button className={`flex-1 ${secondaryButtonClass}`} onClick={onClose}>
          {t('admin.bookings.keep')}
        </button>
        <button className={`flex-1 ${dangerButtonClass}`} disabled={busy} onClick={confirm}>
          {busy ? t('admin.bookings.deleting') : t('admin.bookings.confirm')}
        </button>
      </div>
    </Sheet>
  )
}
