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
        return (
          <button
            key={machine.id}
            onClick={() => onSelect(machine.id)}
            disabled={!machine.active}
            className={`rounded-lg border px-3 py-2 text-sm disabled:opacity-40 ${
              isSelected
                ? 'border-sky-600 bg-sky-600 text-white'
                : 'border-gray-300 bg-white text-gray-800'
            }`}
          >
            {t(`machines.${machine.code}`)}
          </button>
        )
      })}
    </div>
  )
}
