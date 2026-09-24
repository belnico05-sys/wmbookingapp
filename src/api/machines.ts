import type { Machine } from '../lib/types'
import { db } from './client'

/** All machines, ordered by id. Throws if the request fails. */
export async function fetchMachines(): Promise<Machine[]> {
  const { data, error } = await db()
    .from('machines')
    .select('id, code, type, location, active')
    .order('id')
  if (error) throw error
  return data as Machine[]
}
