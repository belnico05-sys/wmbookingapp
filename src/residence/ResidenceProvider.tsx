import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { Machine, ResidenceSettings } from '../lib/types'
import { fetchSettings } from '../api/settings'
import { fetchMachines } from '../api/machines'
import { ResidenceContext, type Residence } from './useResidence'

interface Loaded {
  settings: ResidenceSettings
  machines: Machine[]
}

/** Loads the residence's settings + machines, then renders the app. */
export function ResidenceProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [reloadTick, setReloadTick] = useState(0)
  const reload = useCallback(() => setReloadTick((n) => n + 1), [])

  useEffect(() => {
    let stale = false
    Promise.all([fetchSettings(), fetchMachines()]).then(
      ([settings, machines]) => {
        if (stale) return
        setLoadFailed(false)
        setLoaded({ settings, machines })
      },
      () => {
        if (!stale) setLoadFailed(true)
      },
    )
    return () => {
      stale = true
    }
  }, [reloadTick])

  const residence = useMemo<Residence | null>(
    () => (loaded ? { ...loaded, reload } : null),
    [loaded, reload],
  )

  // After a successful first load, a failed reload keeps showing the old data.
  if (!residence) {
    return (
      <p className={`mx-auto max-w-md p-6 text-sm ${loadFailed ? 'text-accent-600' : 'text-brand-500'}`}>
        {loadFailed ? t('errors.loadFailed') : t('common.loading')}
      </p>
    )
  }

  return <ResidenceContext.Provider value={residence}>{children}</ResidenceContext.Provider>
}
