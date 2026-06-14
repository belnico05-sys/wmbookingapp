import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Machine } from '../lib/types'
import type { Slot } from '../lib/slots'
import { db } from '../lib/supabase'
import { addMyBooking, getProfile, saveProfile } from '../lib/myBookings'
import { formatTime, formatDayLong } from '../lib/format'

interface Props {
  machine: Machine
  slot: Slot
  onClose: () => void
  onBooked: () => void
}

// Error codes raised by the create_booking RPC that have a dedicated message.
const KNOWN_ERRORS = new Set([
  'slot_taken',
  'consent_required',
  'machine_not_available',
  'slot_not_aligned',
  'slot_out_of_hours',
  'slot_in_past',
  'slot_too_far_ahead',
])

export function BookingModal({ machine, slot, onClose, onBooked }: Props) {
  const { t, i18n } = useTranslation()
  const profile = getProfile()
  const [name, setName] = useState(profile?.name ?? '')
  const [apartment, setApartment] = useState(profile?.apartment ?? '')
  const [note, setNote] = useState('')
  const [consent, setConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit =
    consent && name.trim().length >= 2 && apartment.trim().length >= 1 && !submitting

  async function submit() {
    setSubmitting(true)
    setError(null)
    const { data, error: rpcError } = await db().rpc('create_booking', {
      p_machine_id: machine.id,
      p_slot_start: slot.start.toISOString(),
      p_name: name,
      p_apartment: apartment,
      p_consent: consent,
      p_note: note.trim() || null,
    })

    if (rpcError) {
      const code = rpcError.message?.trim()
      setError(KNOWN_ERRORS.has(code) ? t(`errors.${code}`) : t('errors.generic'))
      setSubmitting(false)
      return
    }

    const row = Array.isArray(data) ? data[0] : data
    saveProfile({ name: name.trim(), apartment: apartment.trim() })
    addMyBooking({
      id: row.booking_id,
      cancelToken: row.cancel_token,
      machineId: machine.id,
      slotStart: slot.start.toISOString(),
    })
    onBooked()
  }

  return (
    <div
      className="fixed inset-0 z-10 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-2xl bg-white p-4 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">
          {t('booking.title', { machine: t(`machines.${machine.code}`) })}
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          {t('booking.slot', {
            day: formatDayLong(slot.start, i18n.language),
            start: formatTime(slot.start, i18n.language),
            end: formatTime(slot.end, i18n.language),
          })}
        </p>

        <div className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            {t('booking.name')}
            <input
              className="rounded-lg border border-gray-300 p-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('booking.namePlaceholder')}
              autoComplete="name"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            {t('booking.apartment')}
            <input
              className="rounded-lg border border-gray-300 p-2"
              value={apartment}
              onChange={(e) => setApartment(e.target.value)}
              placeholder={t('booking.apartmentPlaceholder')}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            {t('booking.note')}
            <input
              className="rounded-lg border border-gray-300 p-2"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('booking.noteHint')}
              maxLength={200}
            />
          </label>

          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              className="mt-1"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span>{t('booking.consent')}</span>
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="mt-2 flex gap-2">
            <button
              className="flex-1 rounded-lg border border-gray-300 p-2 text-sm"
              onClick={onClose}
            >
              {t('booking.close')}
            </button>
            <button
              className="flex-1 rounded-lg bg-sky-600 p-2 text-sm font-medium text-white disabled:opacity-40"
              disabled={!canSubmit}
              onClick={submit}
            >
              {submitting ? t('booking.sending') : t('booking.confirm')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
