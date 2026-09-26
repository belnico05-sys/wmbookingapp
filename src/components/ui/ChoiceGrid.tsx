import { useId, useState } from 'react'
import { inputClass } from './styles'

export interface Choice<T extends string | number> {
  value: T
  label: string
}

interface Props<T extends string | number> {
  value: T | null
  options: Choice<T>[]
  onChange: (value: T) => void
  /** Shown while nothing is chosen (already translated). */
  placeholder?: string
  /** Buttons per row in the open grid. */
  columns: 2 | 3 | 6
  /** Accessible name of the field (already translated). */
  ariaLabel: string
}

// Full class names, so Tailwind can find them.
const COLUMNS = { 2: 'grid-cols-2', 3: 'grid-cols-3', 6: 'grid-cols-6' }

/**
 * Replacement for the native <select>, whose drop-down list is drawn by the
 * browser and ignores the site's style. Shows the chosen value; tapping it
 * opens a grid of buttons (same look as the date-picker days) right below.
 */
export function ChoiceGrid<T extends string | number>({
  value,
  options,
  onChange,
  placeholder,
  columns,
  ariaLabel,
}: Props<T>) {
  const [open, setOpen] = useState(false)
  const listId = useId()
  const selected = options.find((o) => o.value === value)

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        className={`${inputClass} flex w-full items-center justify-between text-left`}
      >
        <span className={selected ? '' : 'text-brand-300 dark:text-slate-400'}>
          {selected ? selected.label : placeholder}
        </span>
        <svg
          viewBox="0 0 24 24"
          className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          className={`mt-2 grid max-h-56 gap-1.5 overflow-y-auto rounded-xl bg-brand-50 p-2 ring-1 ring-brand-100 dark:bg-white/[0.04] dark:ring-white/10 ${COLUMNS[columns]}`}
        >
          {options.map((o) => {
            const isSelected = o.value === value
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(o.value)
                  setOpen(false)
                }}
                className={`flex h-10 items-center justify-center rounded-lg px-1 text-sm transition ${
                  isSelected
                    ? 'bg-brand-600 font-bold text-white'
                    : 'bg-white font-semibold text-brand-900 ring-1 ring-brand-100 hover:bg-brand-100 dark:bg-white/[0.06] dark:text-slate-100 dark:ring-white/10 dark:hover:bg-white/10'
                }`}
              >
                {o.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
