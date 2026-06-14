import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isSameDay, isDaySelectable, firstSelectableDay } from '../lib/slots'
import {
  selectableMonths,
  weekdayLabels,
  formatEuDate,
  dayStart,
} from '../lib/calendar'

interface Props {
  selected: Date
  onSelect: (day: Date) => void
}

export function DatePicker({ selected, onSelect }: Props) {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const today = firstSelectableDay()
  const months = selectableMonths()
  const weekdays = weekdayLabels(i18n.language)
  const monthTitleFmt = new Intl.DateTimeFormat(i18n.language, {
    month: 'long',
    year: 'numeric',
  })

  // Show the month that contains the currently-selected day.
  const initialIndex = Math.max(
    0,
    months.findIndex((m) => m.year === selected.getFullYear() && m.month === selected.getMonth()),
  )
  const [index, setIndex] = useState(initialIndex)

  function openSheet() {
    setIndex(initialIndex)
    setOpen(true)
  }

  function pick(day: Date) {
    onSelect(dayStart(day))
    setOpen(false)
  }

  const grid = months[index]

  return (
    <>
      <button
        onClick={openSheet}
        className="flex w-full items-center justify-between rounded-2xl bg-white px-4 py-3 text-left ring-1 ring-brand-100 transition hover:ring-brand-300 dark:bg-white/[0.06] dark:ring-white/10"
      >
        <span>
          <span className="block text-xs font-medium uppercase tracking-wide text-brand-400 dark:text-slate-400">
            {t('common.selectDate')}
          </span>
          <span className="text-lg font-bold text-brand-900 dark:text-slate-100">
            {formatEuDate(selected)}
          </span>
        </span>
        <span className="text-2xl" aria-hidden="true">
          📅
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-30 flex items-end justify-center bg-brand-900/50 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl bg-white p-5 shadow-2xl dark:bg-[#33374a] sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-brand-200 dark:bg-white/20 sm:hidden" />

            <div className="flex items-center justify-between">
              <button
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                disabled={index === 0}
                aria-label={t('common.previousMonth')}
                className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-brand-600 transition hover:bg-brand-50 disabled:opacity-30 dark:text-slate-200 dark:hover:bg-white/10"
              >
                ‹
              </button>
              <p className="text-base font-bold capitalize text-brand-900 dark:text-slate-100">
                {monthTitleFmt.format(new Date(grid.year, grid.month, 1))}
              </p>
              <button
                onClick={() => setIndex((i) => Math.min(months.length - 1, i + 1))}
                disabled={index === months.length - 1}
                aria-label={t('common.nextMonth')}
                className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-brand-600 transition hover:bg-brand-50 disabled:opacity-30 dark:text-slate-200 dark:hover:bg-white/10"
              >
                ›
              </button>
            </div>

            <div className="mt-3 grid grid-cols-7 gap-1">
              {weekdays.map((w) => (
                <span
                  key={w}
                  className="py-1 text-center text-[11px] font-medium uppercase text-brand-300 dark:text-slate-500"
                >
                  {w}
                </span>
              ))}
              {grid.weeks.flat().map((day, i) => {
                if (!day) return <span key={i} />
                const selectable = isDaySelectable(day)
                const isSelected = isSameDay(day, selected)
                const isToday = isSameDay(day, today)
                return (
                  <button
                    key={i}
                    disabled={!selectable}
                    onClick={() => pick(day)}
                    className={`flex h-11 items-center justify-center rounded-xl text-sm transition ${
                      isSelected
                        ? 'bg-brand-600 font-bold text-white'
                        : selectable
                          ? 'font-semibold text-brand-900 hover:bg-brand-100 dark:text-slate-100 dark:hover:bg-white/10'
                          : 'text-brand-200 dark:text-slate-600'
                    } ${isToday && !isSelected ? 'ring-1 ring-brand-400' : ''}`}
                  >
                    {day.getDate()}
                  </button>
                )
              })}
            </div>

            {months.length > 1 && (
              <div className="mt-4 flex justify-center gap-2">
                {months.map((m, i) => (
                  <button
                    key={`${m.year}-${m.month}`}
                    onClick={() => setIndex(i)}
                    aria-label={monthTitleFmt.format(new Date(m.year, m.month, 1))}
                    className={`h-2.5 rounded-full transition-all ${
                      i === index
                        ? 'w-6 bg-brand-600'
                        : 'w-2.5 bg-brand-200 dark:bg-white/25'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
