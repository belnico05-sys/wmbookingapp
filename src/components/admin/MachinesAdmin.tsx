import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { Machine } from '../../lib/types'
import { machineName } from '../../lib/machines'
import { addMachine, updateMachine } from '../../api/admin'
import {
  cardClass,
  errorBoxClass,
  inputClass,
  labelClass,
  primaryButtonClass,
} from '../ui/styles'

interface Props {
  /** All machines, retired ones included. */
  machines: Machine[]
  onChanged: () => void
}

/** Machine list (maintenance on/off, retire/restore, label) + "add machine" form. */
export function MachinesAdmin({ machines, onChanged }: Props) {
  const { t } = useTranslation()
  const [failed, setFailed] = useState(false)

  // Every change goes through here: save, then refresh; show an error if refused.
  async function save(change: () => Promise<void>): Promise<boolean> {
    setFailed(false)
    try {
      await change()
      onChanged()
      return true
    } catch {
      setFailed(true)
      return false
    }
  }

  return (
    <section className={`flex flex-col gap-3 ${cardClass}`}>
      <h3 className="font-bold text-brand-900 dark:text-slate-100">{t('admin.machines.title')}</h3>

      <ul className="flex flex-col gap-2">
        {machines.map((m) => (
          <MachineRow key={m.id} machine={m} onSave={save} />
        ))}
      </ul>
      <p className="text-xs text-brand-400 dark:text-slate-400">{t('admin.machines.retireHint')}</p>

      {failed && <p className={errorBoxClass}>{t('admin.saveFailed')}</p>}

      <AddMachineForm onSave={save} />
    </section>
  )
}

interface RowProps {
  machine: Machine
  onSave: (change: () => Promise<void>) => Promise<boolean>
}

function MachineRow({ machine: m, onSave }: RowProps) {
  const { t } = useTranslation()
  const [label, setLabel] = useState(m.label)
  const [busy, setBusy] = useState(false)

  async function apply(patch: Partial<Pick<Machine, 'label' | 'active' | 'retired'>>) {
    setBusy(true)
    await onSave(() => updateMachine({ ...m, ...patch }))
    setBusy(false)
  }

  const status = m.retired ? 'retired' : m.active ? 'available' : 'maintenance'
  const badgeClass = {
    available: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200',
    maintenance: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200',
    retired: 'bg-brand-100 text-brand-500 dark:bg-white/10 dark:text-slate-400',
  }[status]
  const smallButton = 'rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition disabled:opacity-40'

  return (
    <li className="rounded-xl bg-brand-50 p-3 ring-1 ring-brand-100 dark:bg-white/[0.04] dark:ring-white/10">
      <div className="flex items-center justify-between gap-2">
        <span className={`text-sm font-semibold ${m.retired ? 'text-brand-400 line-through dark:text-slate-500' : 'text-brand-900 dark:text-slate-100'}`}>
          {machineName(t, m)}
        </span>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${badgeClass}`}>
          {t(`admin.machines.status.${status}`)}
        </span>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <input
          className={`${inputClass} w-24 py-1.5 text-sm`}
          value={label}
          maxLength={30}
          onChange={(e) => setLabel(e.target.value)}
          aria-label={t('admin.machines.label')}
          placeholder={t('admin.machines.label')}
        />
        {label.trim() !== m.label && (
          <button
            className={`${smallButton} text-brand-700 ring-brand-300 hover:bg-brand-100 dark:text-slate-200 dark:ring-white/20`}
            disabled={busy}
            onClick={() => apply({ label: label.trim() })}
          >
            {t('admin.save')}
          </button>
        )}
        {!m.retired && (
          <button
            className={`${smallButton} text-amber-800 ring-amber-300 hover:bg-amber-100 dark:text-amber-200 dark:ring-amber-500/40`}
            disabled={busy}
            onClick={() => apply({ active: !m.active })}
          >
            {m.active ? t('admin.machines.setMaintenance') : t('admin.machines.setAvailable')}
          </button>
        )}
        <button
          className={`${smallButton} text-brand-600 ring-brand-200 hover:bg-brand-100 dark:text-slate-300 dark:ring-white/15`}
          disabled={busy}
          onClick={() => apply(m.retired ? { retired: false, active: true } : { retired: true })}
        >
          {m.retired ? t('admin.machines.restore') : t('admin.machines.retire')}
        </button>
      </div>
    </li>
  )
}

function AddMachineForm({ onSave }: { onSave: RowProps['onSave'] }) {
  const { t } = useTranslation()
  const [type, setType] = useState<Machine['type']>('washer')
  const [location, setLocation] = useState<Machine['location']>('internal')
  const [label, setLabel] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    const ok = await onSave(() => addMachine({ type, location, label: label.trim() }))
    setBusy(false)
    if (ok) setLabel('')
  }

  return (
    <form onSubmit={submit} className="mt-2 flex flex-col gap-3 border-t border-brand-100 pt-4 dark:border-white/10">
      <h4 className="text-sm font-bold text-brand-900 dark:text-slate-100">
        {t('admin.machines.addTitle')}
      </h4>
      <div className="grid grid-cols-2 gap-3">
        <label className={labelClass}>
          {t('admin.machines.type')}
          <select
            className={inputClass}
            value={type}
            onChange={(e) => setType(e.target.value as Machine['type'])}
          >
            <option value="washer">{t('machineTypes.washer')}</option>
            <option value="dryer">{t('machineTypes.dryer')}</option>
          </select>
        </label>
        <label className={labelClass}>
          {t('admin.machines.location')}
          <select
            className={inputClass}
            value={location}
            onChange={(e) => setLocation(e.target.value as Machine['location'])}
          >
            <option value="internal">{t('locations.internal')}</option>
            <option value="external">{t('locations.external')}</option>
          </select>
        </label>
      </div>
      <label className={labelClass}>
        {t('admin.machines.label')}
        <input
          className={inputClass}
          value={label}
          maxLength={30}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={t('admin.machines.labelHint')}
        />
      </label>
      <button type="submit" className={primaryButtonClass} disabled={busy}>
        {t('admin.machines.add')}
      </button>
    </form>
  )
}
