import { useTranslation } from 'react-i18next'
import { isSameDay } from '../lib/slots'

interface Props {
  days: Date[]
  selected: Date
  onSelect: (day: Date) => void
}

export function DayPicker({ days, selected, onSelect }: Props) {
  const { t, i18n } = useTranslation()
  const today = new Date()
  const weekdayFmt = new Intl.DateTimeFormat(i18n.language, { weekday: 'short' })
  const monthFmt = new Intl.DateTimeFormat(i18n.language, { month: 'short' })

  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {days.map((day) => {
        const isSelected = isSameDay(day, selected)
        const isToday = isSameDay(day, today)
        return (
          <button
            key={day.toISOString()}
            onClick={() => onSelect(day)}
            className={`flex shrink-0 flex-col items-center rounded-2xl px-3.5 py-2 text-sm transition ${
              isSelected
                ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                : 'bg-white text-brand-900 ring-1 ring-brand-100 hover:ring-brand-300 dark:bg-brand-900/40 dark:text-brand-100 dark:ring-brand-800'
            }`}
          >
            <span className="text-[11px] font-medium uppercase opacity-80">
              {isToday ? t('common.today') : weekdayFmt.format(day)}
            </span>
            <span className="text-lg font-bold leading-tight">{day.getDate()}</span>
            <span className="text-[10px] uppercase opacity-70">
              {monthFmt.format(day)}
            </span>
          </button>
        )
      })}
    </div>
  )
}
