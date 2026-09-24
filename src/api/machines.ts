import type { Machine } from '../lib/types'
import { db } from './client'

/**
 * Machines ordered by id. Retired machines are left out unless
 * includeRetired is set (the admin panel needs them). Throws on failure.
 */
export async function fetchMachines({ includeRetired = false } = {}): Promise<Machine[]> {
  let query = db()
    .from('machines')
    .select('id, code, type, location, label, active, retired')
    .order('id')
  if (!includeRetired) query = query.eq('retired', false)
  const { data, error } = await query
  if (error) throw error
  return data as Machine[]
}
