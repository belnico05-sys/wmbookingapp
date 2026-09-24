import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Machine } from '../lib/types'
import { cancelMyBooking, type MyBooking } from '../auth/identity'
import { Sheet } from './ui/Sheet'
import { SlotPill } from './SlotPill'

interface Props {
  booking: MyBooking
  machine: Machine | undefined
  onClose: () => void
  /** Called after the booking was deleted (the sheet closes itself too). */
  onCancelled: () => void
}

/** "Cancel this booking?" confirmation, then the actual cancellation. */
export function CancelBookingSheet({ booking, machine, onClose, onCancelled }: Props) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  async function confirm() {
    setBusy(true)
    setFailed(false)
    const ok = await cancelMyBooking(booking.id)
    setBusy(false)
    if (!ok) {
      setFailed(true)
      return
    }
    onCancelled()
    onClose()
  }

  return (
    <Sheet onClose={onClose}>
      <h2 className="text-lg font-bold text-brand-900 dark:text-slate-100">
        {t('cancel.title')}
      </h2>
      <p className="mt-1 text-sm font-semibold text-brand-700 dark:text-slate-300">
        {machine ? t(`machines.${machine.code}`) : `#${booking.machineId}`}
      </p>
      <SlotPill start={booking.slotStart} />

      {failed && (
        <p className="mt-4 rounded-xl bg-accent-100 px-3 py-2 text-sm font-medium text-accent-700 dark:bg-accent-700/20 dark:text-accent-100">
          {t('myBookings.cancelFailed')}
        </p>
      )}

      <div className="mt-5 flex gap-2.5">
        <button
          className="flex-1 rounded-xl py-3 text-sm font-semibold text-brand-700 ring-1 ring-brand-200 transition hover:bg-brand-50 dark:text-slate-200 dark:ring-white/15 dark:hover:bg-white/5"
          onClick={onClose}
        >
          {t('cancel.keep')}
        </button>
        <button
          className="flex-1 rounded-xl bg-accent-600 py-3 text-sm font-semibold text-white shadow-md shadow-accent-600/30 transition hover:bg-accent-700 disabled:opacity-40 disabled:shadow-none"
          disabled={busy}
          onClick={confirm}
        >
          {busy ? t('cancel.sending') : t('cancel.confirm')}
        </button>
      </div>
    </Sheet>
  )
}
