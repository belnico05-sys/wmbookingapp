import { useTranslation } from 'react-i18next'
import type { Machine } from '../lib/types'
import { machineName } from '../lib/machines'
import type { Slot } from '../lib/slots'
import { downloadIcs, googleCalendarUrl } from '../lib/ics'
import { SlotPill } from './SlotPill'
import { NotificationsCard } from './NotificationsCard'
import { useResidence } from '../residence/useResidence'

interface Props {
  machine: Machine
  slot: Slot
  onClose: () => void
}

/** Second step of the booking sheet: confirmation + calendar reminder. */
export function BookingSuccess({ machine, slot, onClose }: Props) {
  const { t } = useTranslation()
  const { noticesEnabled } = useResidence().settings

  const reminderEvent = {
    title: t('reminder.summary', { machine: machineName(t, machine) }),
    description: t('reminder.description'),
    start: slot.start,
    end: slot.end,
  }

  return (
    <div className="flex flex-col items-center py-2 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-3xl dark:bg-emerald-500/20">
        ✓
      </span>
      <h2 className="mt-3 text-lg font-bold text-brand-900 dark:text-slate-100">
        {t('booking.successTitle')}
      </h2>
      <SlotPill start={slot.start} />
      <p className="mt-4 text-sm text-brand-600 dark:text-slate-300">
        {t('booking.reminderQuestion')}
      </p>
      <div className="mt-3 flex w-full flex-col gap-2.5">
        {noticesEnabled && <NotificationsCard mode="prompt" />}
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
  )
}
