import type { ResidenceSettings } from '../lib/types'
import { db } from './client'

interface SettingsRow {
  residence_name: string
  apartment_count: number
  first_slot_hour: number
  last_slot_hour: number
  window_days: number
  notices_enabled: boolean
}

/** The residence's settings (single row). Throws if the request fails. */
export async function fetchSettings(): Promise<ResidenceSettings> {
  const { data, error } = await db()
    .from('settings')
    .select('residence_name, apartment_count, first_slot_hour, last_slot_hour, window_days, notices_enabled')
    .single()
  if (error) throw error
  const row = data as SettingsRow
  return {
    residenceName: row.residence_name,
    apartmentCount: row.apartment_count,
    firstSlotHour: row.first_slot_hour,
    lastSlotHour: row.last_slot_hour,
    windowDays: row.window_days,
    noticesEnabled: row.notices_enabled,
  }
}
