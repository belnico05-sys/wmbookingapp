import { useEffect, useState } from 'react'
import type { Machine } from '../lib/types'
import { fetchMachines } from '../api/machines'

/** Loads the machine list once. `machines` is null while loading. */
export function useMachines() {
  const [machines, setMachines] = useState<Machine[] | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    fetchMachines().then(setMachines, () => setLoadFailed(true))
  }, [])

  return { machines, loadFailed }
}
