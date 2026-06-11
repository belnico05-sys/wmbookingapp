import { useTranslation } from 'react-i18next'
import { isSameDay } from '../lib/slots'
import { formatDayShort } from '../lib/format'

interface Props {
  days: Date[]
  selected: Date
  onSelect: (day: Date) => void
}

export function DayPicker({ days, selected, onSelect }: Props) {
  const { t, i18n } = useTranslation()
  const today = new Date()

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {days.map((day) => {
        const isSelected = isSameDay(day, selected)
        return (
          <button
            key={day.toISOString()}
            onClick={() => onSelect(day)}
            className={`shrink-0 rounded-lg border px-3 py-2 text-sm ${
              isSelected
                ? 'border-sky-600 bg-sky-600 text-white'
                : 'border-gray-300 bg-white text-gray-800'
            }`}
          >
            {isSameDay(day, today) ? t('common.today') : formatDayShort(day, i18n.language)}
          </button>
        )
      })}
    </div>
  )
}
