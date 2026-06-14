import { useTranslation } from 'react-i18next'
import type { Machine } from '../lib/types'

interface Props {
  machines: Machine[]
  selectedId: number | null
  onSelect: (id: number) => void
}

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
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition disabled:opacity-40 ${
              isSelected
                ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                : 'bg-white text-brand-900 ring-1 ring-brand-100 hover:ring-brand-300 dark:bg-brand-900/40 dark:text-brand-100 dark:ring-brand-800'
            }`}
          >
            <span aria-hidden="true">{icon}</span>
            {t(`machines.${machine.code}`)}
          </button>
        )
      })}
    </div>
  )
}
