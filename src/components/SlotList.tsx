import { useTranslation } from 'react-i18next'
import type { Booking, Machine, Notice } from '../lib/types'
import { canPostNotice, NOTICE_ICON } from '../lib/notices'
import { slotsForDay, isSlotOver, type Slot } from '../lib/slots'
import { formatTime } from '../lib/format'
import { useResidence } from '../residence/useResidence'

interface Props {
  machine: Machine
  day: Date
  bookings: Booking[]
  myBookingIds: Set<string>
  /** A free slot was tapped ("+"). */
  onPick: (slot: Slot) => void
  /** The "−" on one of the user's own bookings was tapped. */
  onCancel: (booking: Booking) => void
  /** Active notice-board notices (empty when the feature is off). */
  notices: Notice[]
  /** The 📢 on one of the user's own bookings was tapped (null = feature off). */
  onNotice: ((booking: Booking) => void) | null
}

/** The day's slots for one machine: free ("+"), taken, or the user's own ("−"). */
export function SlotList({
  machine,
  day,
  bookings,
  myBookingIds,
  onPick,
  onCancel,
  notices,
  onNotice,
}: Props) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const rules = useResidence().settings
  const underMaintenance = !machine.active

  // Index this machine's bookings by slot-start timestamp for quick lookup.
  const byStart = new Map<number, Booking>()
  for (const b of bookings) {
    if (b.machineId === machine.id) {
      byStart.set(b.slotStart.getTime(), b)
    }
  }

  // Latest notice per booking (notices arrive newest first).
  const noticeOf = new Map<string, Notice>()
  for (const n of notices) {
    if (!noticeOf.has(n.bookingId)) noticeOf.set(n.bookingId, n)
  }

  return (
    <ul className="flex flex-col gap-2">
      {underMaintenance && (
        <li className="rounded-2xl bg-amber-50 p-3.5 text-sm font-medium text-amber-900 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/30">
          🔧 {t('slots.maintenanceNotice')}
        </li>
      )}
      {slotsForDay(day, rules).map((slot) => {
        const booking = byStart.get(slot.start.getTime())
        const over = isSlotOver(slot)
        // Free slots can't be booked once over, or while the machine is under maintenance.
        const unavailable = over || underMaintenance
        const mine = booking ? myBookingIds.has(booking.id) : false
        const range = t('slots.range', {
          start: formatTime(slot.start, lang),
          end: formatTime(slot.end, lang),
        })

        if (booking) {
          const notice = noticeOf.get(booking.id)
          return (
            <li
              key={slot.start.toISOString()}
              className={`rounded-2xl p-3.5 text-sm ring-1 ${
                mine
                  ? 'bg-brand-50 ring-brand-300 dark:bg-brand-500/15 dark:ring-brand-400/40'
                  : 'bg-white ring-brand-100 dark:bg-white/[0.04] dark:ring-white/10'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-brand-900 dark:text-slate-100">
                  {range}
                </span>
                {mine ? (
                  <span className="flex items-center gap-1.5">
                    <span className="rounded-full bg-brand-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                      {t('slots.yours')}
                    </span>
                    {onNotice && canPostNotice(slot.start) && (
                      <button
                        onClick={() => onNotice(booking)}
                        aria-label={t('notices.post.button')}
                        title={t('notices.post.button')}
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-xs leading-none transition hover:bg-amber-500"
                      >
                        📢
                      </button>
                    )}
                    {!over && (
                      <button
                        onClick={() => onCancel(booking)}
                        aria-label={t('slots.cancelMine')}
                        title={t('slots.cancelMine')}
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-600 text-base leading-none text-white transition hover:bg-accent-700"
                      >
                        −
                      </button>
                    )}
                  </span>
                ) : (
                  <span className="text-right text-brand-700 dark:text-slate-300">
                    {t('slots.bookedBy', {
                      name: booking.name,
                      apartment: booking.apartment,
                    })}
                  </span>
                )}
              </div>
              {notice && (
                <p className="mt-1.5 inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-500/20 dark:text-amber-100">
                  {NOTICE_ICON[notice.kind]} {t(`notices.tags.${notice.kind}`)}
                </p>
              )}
              {booking.note && (
                <p className="mt-1.5 rounded-lg bg-brand-100/60 px-2 py-1 text-xs text-brand-700 dark:bg-white/10 dark:text-slate-200">
                  {t('slots.note', { note: booking.note })}
                </p>
              )}
            </li>
          )
        }

        return (
          <li key={slot.start.toISOString()}>
            <button
              disabled={unavailable}
              onClick={() => onPick(slot)}
              className={`flex w-full items-center justify-between rounded-2xl p-3.5 text-sm transition ${
                unavailable
                  ? 'cursor-not-allowed bg-transparent text-brand-300 ring-1 ring-brand-100 dark:text-slate-600 dark:ring-white/5'
                  : 'bg-white text-brand-900 ring-1 ring-emerald-200 hover:bg-emerald-50 hover:ring-emerald-400 dark:bg-white/[0.04] dark:text-slate-100 dark:ring-emerald-500/30 dark:hover:bg-emerald-500/10'
              }`}
            >
              <span className="font-bold">{range}</span>
              {unavailable ? (
                <span className="text-xs uppercase tracking-wide">
                  {over ? t('slots.over') : t('machines.maintenance')}
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
