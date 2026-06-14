import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Machine } from '../lib/types'
import type { Slot } from '../lib/slots'
import { db } from '../lib/supabase'
import { addMyBooking, getProfile, saveProfile } from '../lib/myBookings'
import { formatTime, formatDayLong } from '../lib/format'
import { downloadIcs, googleCalendarUrl } from '../lib/ics'

interface Props {
  machine: Machine
  slot: Slot
  onClose: () => void
  /** Refresh the schedule. Does NOT close the modal (success step follows). */
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
  const [succeeded, setSucceeded] = useState(false)

  const canSubmit =
    consent && name.trim().length >= 2 && apartment.trim().length >= 1 && !submitting

  const reminderEvent = {
    title: t('reminder.summary', { machine: t(`machines.${machine.code}`) }),
    description: t('reminder.description'),
    start: slot.start,
    end: slot.end,
  }

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
    setSucceeded(true)
  }

  const inputClass =
    'rounded-xl bg-brand-50 p-2.5 text-brand-900 ring-1 ring-brand-200 outline-none placeholder:text-brand-300 focus:ring-2 focus:ring-brand-500 dark:bg-white/[0.06] dark:text-slate-100 dark:ring-white/15 dark:placeholder:text-slate-400'

  const slotPill = (
    <p className="mt-1 inline-block rounded-full bg-brand-100 px-3 py-1 text-sm font-medium text-brand-700 dark:bg-brand-500/25 dark:text-brand-100">
      {t('booking.slot', {
        day: formatDayLong(slot.start, i18n.language),
        start: formatTime(slot.start, i18n.language),
        end: formatTime(slot.end, i18n.language),
      })}
    </p>
  )

  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-brand-900/50 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl dark:bg-[#33374a] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-brand-200 dark:bg-white/20 sm:hidden" />

        {succeeded ? (
          <div className="flex flex-col items-center py-2 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-3xl dark:bg-emerald-500/20">
              ✓
            </span>
            <h2 className="mt-3 text-lg font-bold text-brand-900 dark:text-slate-100">
              {t('booking.successTitle')}
            </h2>
            {slotPill}
            <p className="mt-4 text-sm text-brand-600 dark:text-slate-300">
              {t('booking.reminderQuestion')}
            </p>
            <div className="mt-3 flex w-full flex-col gap-2.5">
              <button
                className="rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white shadow-md shadow-brand-600/30 transition hover:bg-brand-700"
                onClick={() => downloadIcs(reminderEvent)}
              >
                📅 {t('booking.addCalendar')}
              </button>
              <a
                href={googleCalendarUrl(reminderEvent)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl py-3 text-center text-sm font-semibold text-brand-700 ring-1 ring-brand-200 transition hover:bg-brand-50 dark:text-slate-200 dark:ring-white/15 dark:hover:bg-white/5"
              >
                {t('booking.addGoogle')}
              </a>
              <button
                className="mt-1 rounded-xl py-3 text-sm font-semibold text-brand-500 transition hover:text-brand-700 dark:text-slate-400 dark:hover:text-slate-200"
                onClick={onClose}
              >
                {t('booking.done')}
              </button>
            </div>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-bold text-brand-900 dark:text-slate-100">
              {t('booking.title', { machine: t(`machines.${machine.code}`) })}
            </h2>
            {slotPill}

            <div className="mt-4 flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-sm font-medium text-brand-800 dark:text-slate-200">
                {t('booking.name')}
                <input
                  className={inputClass}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('booking.namePlaceholder')}
                  autoComplete="name"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm font-medium text-brand-800 dark:text-slate-200">
                {t('booking.apartment')}
                <input
                  className={inputClass}
                  value={apartment}
                  onChange={(e) => setApartment(e.target.value)}
                  placeholder={t('booking.apartmentPlaceholder')}
                />
              </label>

              <label className="flex flex-col gap-1 text-sm font-medium text-brand-800 dark:text-slate-200">
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
          </>
        )}
      </div>
    </div>
  )
}
