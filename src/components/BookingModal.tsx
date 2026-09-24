import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Machine } from '../lib/types'
import { machineName } from '../lib/machines'
import type { Slot } from '../lib/slots'
import { BookingError } from '../api/bookings'
import { createMyBooking, getProfile } from '../auth/identity'
import { useResidence } from '../residence/useResidence'
import { Sheet } from './ui/Sheet'
import {
  errorBoxClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from './ui/styles'
import { SlotPill } from './SlotPill'
import { BookingSuccess } from './BookingSuccess'

interface Props {
  machine: Machine
  slot: Slot
  onClose: () => void
  /** Refresh the schedule. Does NOT close the sheet (the success step follows). */
  onBooked: () => void
}

function isValidApartment(value: string | undefined, count: number): boolean {
  return value !== undefined && /^[0-9]+$/.test(value) && Number(value) >= 1 && Number(value) <= count
}

/** Booking form (name, apartment, note, mandatory consent), then the success step. */
export function BookingModal({ machine, slot, onClose, onBooked }: Props) {
  const { t } = useTranslation()
  const { apartmentCount, firstSlotHour, lastSlotHour, windowDays } = useResidence().settings
  const profile = getProfile()
  const [name, setName] = useState(profile?.name ?? '')
  // Prefill only a remembered apartment that is still valid (1 … apartmentCount).
  const [apartment, setApartment] = useState(() =>
    isValidApartment(profile?.apartment, apartmentCount) ? String(Number(profile!.apartment)) : '',
  )
  const [note, setNote] = useState('')
  const [consent, setConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [succeeded, setSucceeded] = useState(false)

  const canSubmit =
    consent && name.trim().length >= 2 && apartment !== '' && !submitting

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
      // Values for the messages that mention the residence's rules.
      const pad = (h: number) => `${String(h).padStart(2, '0')}:00`
      setError(
        t(`errors.${code}`, {
          from: pad(firstSlotHour),
          to: pad(lastSlotHour + 1),
          days: windowDays,
        }),
      )
      setSubmitting(false)
      return
    }
    onBooked()
    setSucceeded(true)
  }

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
        {t('booking.title', { machine: machineName(t, machine) })}
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
          <select
            className={inputClass}
            value={apartment}
            onChange={(e) => setApartment(e.target.value)}
          >
            <option value="" disabled>
              {t('booking.apartmentPlaceholder')}
            </option>
            {Array.from({ length: apartmentCount }, (_, i) => String(i + 1)).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
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
          <p className={errorBoxClass}>
            {error}
          </p>
        )}

        <div className="mt-1 flex gap-2.5">
          <button
            className={`flex-1 ${secondaryButtonClass}`}
            onClick={onClose}
          >
            {t('booking.close')}
          </button>
          <button
            className={`flex-1 ${primaryButtonClass}`}
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
