import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Machine } from '../lib/types'
import type { Slot } from '../lib/slots'
import { BookingError } from '../api/bookings'
import { createMyBooking, getProfile } from '../auth/identity'
import { Sheet } from './ui/Sheet'
import { SlotPill } from './SlotPill'
import { BookingSuccess } from './BookingSuccess'

interface Props {
  machine: Machine
  slot: Slot
  onClose: () => void
  /** Refresh the schedule. Does NOT close the sheet (the success step follows). */
  onBooked: () => void
}

/** Booking form (name, apartment, note, mandatory consent), then the success step. */
export function BookingModal({ machine, slot, onClose, onBooked }: Props) {
  const { t } = useTranslation()
  const profile = getProfile()
  const [name, setName] = useState(profile?.name ?? '')
  const [apartment, setApartment] = useState(profile?.apartment ?? '')
  const [note, setNote] = useState('')
  const [consent, setConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [succeeded, setSucceeded] = useState(false)

  const canSubmit =
    consent && name.trim().length >= 2 && apartment.trim().length >= 1 && !submitting

  async function submit() {
    setSubmitting(true)
    setError(null)
    try {
      await createMyBooking({
        machineId: machine.id,
        slotStart: slot.start,
        name,
        apartment,
        note: note.trim() || null,
        consent,
      })
    } catch (e) {
      const code = e instanceof BookingError ? e.code : 'generic'
      setError(t(`errors.${code}`))
      setSubmitting(false)
      return
    }
    onBooked()
    setSucceeded(true)
  }

  const inputClass =
    'rounded-xl bg-brand-50 p-2.5 text-brand-900 ring-1 ring-brand-200 outline-none placeholder:text-brand-300 focus:ring-2 focus:ring-brand-500 dark:bg-white/[0.06] dark:text-slate-100 dark:ring-white/15 dark:placeholder:text-slate-400'
  const labelClass = 'flex flex-col gap-1 text-sm font-medium text-brand-800 dark:text-slate-200'

  if (succeeded) {
    return (
      <Sheet onClose={onClose}>
        <BookingSuccess machine={machine} slot={slot} onClose={onClose} />
      </Sheet>
    )
  }

  return (
    <Sheet onClose={onClose}>
      <h2 className="text-lg font-bold text-brand-900 dark:text-slate-100">
        {t('booking.title', { machine: t(`machines.${machine.code}`) })}
      </h2>
      <SlotPill start={slot.start} />

      <div className="mt-4 flex flex-col gap-3">
        <label className={labelClass}>
          {t('booking.name')}
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('booking.namePlaceholder')}
            autoComplete="name"
          />
        </label>

        <label className={labelClass}>
          {t('booking.apartment')}
          <input
            className={inputClass}
            value={apartment}
            onChange={(e) => setApartment(e.target.value)}
            placeholder={t('booking.apartmentPlaceholder')}
          />
        </label>

        <label className={labelClass}>
          {t('booking.note')}
          <input
            className={inputClass}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('booking.noteHint')}
            maxLength={200}
          />
        </label>

        <label className="flex items-start gap-2.5 rounded-xl bg-brand-50 p-3 text-sm text-brand-800 ring-1 ring-brand-100 dark:bg-white/[0.04] dark:text-slate-200 dark:ring-white/10">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-brand-600"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <span>{t('booking.consent')}</span>
        </label>

        {error && (
          <p className="rounded-xl bg-accent-100 px-3 py-2 text-sm font-medium text-accent-700 dark:bg-accent-700/20 dark:text-accent-100">
            {error}
          </p>
        )}

        <div className="mt-1 flex gap-2.5">
          <button
            className="flex-1 rounded-xl py-3 text-sm font-semibold text-brand-700 ring-1 ring-brand-200 transition hover:bg-brand-50 dark:text-slate-200 dark:ring-white/15 dark:hover:bg-white/5"
            onClick={onClose}
          >
            {t('booking.close')}
          </button>
          <button
            className="flex-1 rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white shadow-md shadow-brand-600/30 transition hover:bg-brand-700 disabled:opacity-40 disabled:shadow-none"
            disabled={!canSubmit}
            onClick={submit}
          >
            {submitting ? t('booking.sending') : t('booking.confirm')}
          </button>
        </div>
      </div>
    </Sheet>
  )
}
