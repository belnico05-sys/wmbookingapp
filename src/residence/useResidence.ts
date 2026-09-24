// Everything configurable per residence (settings + machines), loaded once by
// <ResidenceProvider> and available anywhere below it through useResidence().

import { createContext, useContext } from 'react'
import type { Machine, ResidenceSettings } from '../lib/types'

export interface Residence {
  settings: ResidenceSettings
  /** Machines that are not retired (including those under maintenance). */
  machines: Machine[]
  /** Refetch settings and machines, e.g. after the admin saved a change. */
  reload: () => void
}

export const ResidenceContext = createContext<Residence | null>(null)

export function useResidence(): Residence {
  const residence = useContext(ResidenceContext)
  if (!residence) throw new Error('useResidence() must be used inside <ResidenceProvider>')
  return residence
}
