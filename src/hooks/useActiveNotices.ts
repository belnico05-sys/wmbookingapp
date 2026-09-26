import { useCallback, useEffect, useState } from 'react'
import type { Notice } from '../lib/types'
import { fetchActiveNotices, subscribeToNoticeChanges } from '../api/notices'

/**
 * The notices currently on the board, kept up to date live (Supabase
 * Realtime). Always empty while the feature is off.
 */
export function useActiveNotices(enabled: boolean) {
  const [notices, setNotices] = useState<Notice[]>([])
  const [reloadTick, setReloadTick] = useState(0)
  const reload = useCallback(() => setReloadTick((n) => n + 1), [])

  useEffect(() => {
    if (!enabled) return
    let stale = false
    fetchActiveNotices().then(
      (data) => {
        if (!stale) setNotices(data)
      },
      () => {}, // the board is a bonus: keep what we have
    )
    return () => {
      stale = true
    }
  }, [enabled, reloadTick])

  useEffect(() => (enabled ? subscribeToNoticeChanges(reload) : undefined), [enabled, reload])

  return { notices: enabled ? notices : [], reload }
}
