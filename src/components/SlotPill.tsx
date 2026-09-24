import { useTranslation } from 'react-i18next'
import { SLOT_MINUTES } from '../lib/config'
import { formatDayLong, formatTime } from '../lib/format'

interface Props {
  start: Date
}

/** "Thursday 24 September, 10:00–11:00" badge used in the sheets. */
export function SlotPill({ start }: Props) {
  const { t, i18n } = useTranslation()
  const end = new Date(start.getTime() + SLOT_MINUTES * 60_000)
  return (
    <p className="mt-1 inline-block rounded-full bg-brand-100 px-3 py-1 text-sm font-medium text-brand-700 dark:bg-brand-500/25 dark:text-brand-100">
      {t('booking.slot', {
        day: formatDayLong(start, i18n.language),
        start: formatTime(start, i18n.language),
        end: formatTime(end, i18n.language),
      })}
    </p>
  )
}
