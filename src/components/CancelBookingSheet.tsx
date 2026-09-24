import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Machine } from '../lib/types'
import { machineName } from '../lib/machines'
import { cancelMyBooking, type MyBooking } from '../auth/identity'
import { Sheet } from './ui/Sheet'
import { dangerButtonClass, errorBoxClass, secondaryButtonClass } from './ui/styles'
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
        {machine ? machineName(t, machine) : `#${booking.machineId}`}
      </p>
      <SlotPill start={booking.slotStart} />

      {failed && (
        <p className={`mt-4 ${errorBoxClass}`}>
          {t('myBookings.cancelFailed')}
        </p>
      )}

      <div className="mt-5 flex gap-2.5">
        <button
          className={`flex-1 ${secondaryButtonClass}`}
          onClick={onClose}
        >
          {t('cancel.keep')}
        </button>
        <button
          className={`flex-1 ${dangerButtonClass}`}
          disabled={busy}
          onClick={confirm}
        >
          {busy ? t('cancel.sending') : t('cancel.confirm')}
        </button>
      </div>
    </Sheet>
  )
}
