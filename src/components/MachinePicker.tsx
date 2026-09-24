import { useTranslation } from 'react-i18next'
import type { Machine } from '../lib/types'
import { machineName } from '../lib/machines'

interface Props {
  machines: Machine[]
  selectedId: number | null
  onSelect: (id: number) => void
}

/** Machine chips. Machines under maintenance are shown but cannot be picked. */
export function MachinePicker({ machines, selectedId, onSelect }: Props) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-wrap gap-2">
      {machines.map((machine) => {
        const isSelected = machine.id === selectedId
        const icon = machine.type === 'washer' ? '🌀' : '☀️'
        return (
          <button
            key={machine.id}
            onClick={() => onSelect(machine.id)}
            disabled={!machine.active}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition disabled:opacity-50 ${
              isSelected
                ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                : 'bg-white text-brand-900 ring-1 ring-brand-100 hover:ring-brand-300 dark:bg-white/[0.06] dark:text-slate-100 dark:ring-white/10'
            }`}
          >
            <span aria-hidden="true">{machine.active ? icon : '🔧'}</span>
            {machineName(t, machine)}
            {!machine.active && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">
                {t('machines.maintenance')}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
