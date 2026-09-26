import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { updateSettings } from '../../api/admin'
import { useResidence } from '../../residence/useResidence'
import type { ResidenceSettings } from '../../lib/types'
import { cardClass, errorBoxClass, inputClass, labelClass, primaryButtonClass } from '../ui/styles'

interface Props {
  onSaved: () => void
}

const HOURS = Array.from({ length: 24 }, (_, h) => h)
const hh = (h: number) => `${String(h).padStart(2, '0')}:00`

/** The same limits as the check constraints on the `settings` table. */
function isValid(s: ResidenceSettings): boolean {
  const int = Number.isInteger
  return (
    s.residenceName.trim().length <= 80 &&
    int(s.apartmentCount) && s.apartmentCount >= 1 && s.apartmentCount <= 999 &&
    int(s.windowDays) && s.windowDays >= 1 && s.windowDays <= 90 &&
    s.firstSlotHour <= s.lastSlotHour
  )
}

/** Residence name, apartment count, opening hours and booking window. */
export function SettingsForm({ onSaved }: Props) {
  const { t } = useTranslation()
  const current = useResidence().settings
  // Number fields are kept as text while typing, and converted on save.
  const [residenceName, setResidenceName] = useState(current.residenceName)
  const [apartmentCount, setApartmentCount] = useState(String(current.apartmentCount))
  const [firstSlotHour, setFirstSlotHour] = useState(current.firstSlotHour)
  const [lastSlotHour, setLastSlotHour] = useState(current.lastSlotHour)
  const [windowDays, setWindowDays] = useState(String(current.windowDays))
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<'saved' | 'invalid' | 'failed' | null>(null)

  async function save(e: FormEvent) {
    e.preventDefault()
    const next: ResidenceSettings = {
      residenceName: residenceName.trim(),
      apartmentCount: Number(apartmentCount),
      firstSlotHour,
      lastSlotHour,
      windowDays: Number(windowDays),
      // Switched from the notice-board section, not from this form.
      noticesEnabled: current.noticesEnabled,
    }
    if (!isValid(next)) {
      setResult('invalid')
      return
    }
    setBusy(true)
    setResult(null)
    try {
      await updateSettings(next)
      setResult('saved')
      onSaved()
    } catch {
      setResult('failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={save} className={`flex flex-col gap-3 ${cardClass}`}>
      <h3 className="font-bold text-brand-900 dark:text-slate-100">{t('admin.settings.title')}</h3>

      <label className={labelClass}>
        {t('admin.settings.residenceName')}
        <input
          className={inputClass}
          value={residenceName}
          maxLength={80}
          onChange={(e) => setResidenceName(e.target.value)}
          placeholder={t('admin.settings.residenceNameHint')}
        />
      </label>

      <label className={labelClass}>
        {t('admin.settings.apartmentCount')}
        <input
          className={inputClass}
          type="number"
          inputMode="numeric"
          min={1}
          max={999}
          value={apartmentCount}
          onChange={(e) => setApartmentCount(e.target.value)}
        />
        <span className="text-xs font-normal text-brand-400 dark:text-slate-400">
          {t('admin.settings.apartmentCountHint')}
        </span>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className={labelClass}>
          {t('admin.settings.firstSlot')}
          <select
            className={inputClass}
            value={firstSlotHour}
            onChange={(e) => setFirstSlotHour(Number(e.target.value))}
          >
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {t('slots.range', { start: hh(h), end: hh(h + 1) })}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          {t('admin.settings.lastSlot')}
          <select
            className={inputClass}
            value={lastSlotHour}
            onChange={(e) => setLastSlotHour(Number(e.target.value))}
          >
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {t('slots.range', { start: hh(h), end: hh(h + 1) })}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className={labelClass}>
        {t('admin.settings.windowDays')}
        <input
          className={inputClass}
          type="number"
          inputMode="numeric"
          min={1}
          max={90}
          value={windowDays}
          onChange={(e) => setWindowDays(e.target.value)}
        />
      </label>

      <p className="text-xs text-brand-400 dark:text-slate-400">{t('admin.settings.keepNote')}</p>

      {result === 'invalid' && <p className={errorBoxClass}>{t('admin.settings.invalid')}</p>}
      {result === 'failed' && <p className={errorBoxClass}>{t('admin.saveFailed')}</p>}
      {result === 'saved' && (
        <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          {t('admin.saved')}
        </p>
      )}

      <button type="submit" className={primaryButtonClass} disabled={busy}>
        {busy ? t('admin.saving') : t('admin.save')}
      </button>
    </form>
  )
}
