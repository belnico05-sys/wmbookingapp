import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Machine } from '../../lib/types'
import { fetchMachines } from '../../api/machines'
import { useResidence } from '../../residence/useResidence'
import { SettingsForm } from './SettingsForm'
import { MachinesAdmin } from './MachinesAdmin'
import { BookingsAdmin } from './BookingsAdmin'

/**
 * The three admin sections. Holds the full machine list (retired ones
 * included), which both the machines and the bookings sections need.
 */
export function AdminPanel() {
  const { t } = useTranslation()
  const residence = useResidence()
  const [machines, setMachines] = useState<Machine[] | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [reloadTick, setReloadTick] = useState(0)

  useEffect(() => {
    fetchMachines({ includeRetired: true }).then(setMachines, () => setLoadFailed(true))
  }, [reloadTick])

  // After any change: refresh this list and the student-facing data.
  const onChanged = useCallback(() => {
    setReloadTick((n) => n + 1)
    residence.reload()
  }, [residence])

  if (!machines) {
    return (
      <p className={`mt-4 text-sm ${loadFailed ? 'text-accent-600' : 'text-brand-500'}`}>
        {loadFailed ? t('errors.loadFailed') : t('common.loading')}
      </p>
    )
  }

  return (
    <div className="mt-4 flex flex-col gap-6">
      <SettingsForm onSaved={onChanged} />
      <MachinesAdmin machines={machines} onChanged={onChanged} />
      <BookingsAdmin machines={machines} />
    </div>
  )
}
