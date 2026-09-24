// Admin-only operations and the admin's login session.
//
// The manager signs in with a Supabase Auth email + password account. Every
// write below goes through an admin_* database function that refuses the
// call unless the signed-in user is listed in the `admins` table, so hiding
// the panel is not what protects these operations: the database is.

import type { Session } from '@supabase/supabase-js'
import type { Machine, ResidenceSettings } from '../lib/types'
import { db } from './client'

/** Signs in. Resolves false for wrong email/password. */
export async function signIn(email: string, password: string): Promise<boolean> {
  const { error } = await db().auth.signInWithPassword({ email, password })
  return !error
}

export async function signOut(): Promise<void> {
  await db().auth.signOut()
}

/**
 * Calls onChange with the current session right away, then on every sign-in
 * or sign-out. Returns the function that stops listening.
 */
export function onSessionChange(onChange: (session: Session | null) => void): () => void {
  const { data } = db().auth.onAuthStateChange((_event, session) => {
    // Deferred: Supabase must not be called from inside this callback.
    setTimeout(() => onChange(session), 0)
  })
  return () => data.subscription.unsubscribe()
}

/** Whether the signed-in user is an admin (false when signed out). */
export async function checkIsAdmin(): Promise<boolean> {
  const { data, error } = await db().rpc('is_admin')
  return !error && data === true
}

/** Throws if the database refuses the call. */
async function adminRpc(fn: string, args: Record<string, unknown>): Promise<void> {
  const { error } = await db().rpc(fn, args)
  if (error) throw error
}

export function updateSettings(s: ResidenceSettings): Promise<void> {
  return adminRpc('admin_update_settings', {
    p_residence_name: s.residenceName,
    p_apartment_count: s.apartmentCount,
    p_first_slot_hour: s.firstSlotHour,
    p_last_slot_hour: s.lastSlotHour,
    p_window_days: s.windowDays,
  })
}

export function addMachine(m: Pick<Machine, 'type' | 'location' | 'label'>): Promise<void> {
  return adminRpc('admin_add_machine', {
    p_type: m.type,
    p_location: m.location,
    p_label: m.label,
  })
}

export function updateMachine(m: Pick<Machine, 'id' | 'label' | 'active' | 'retired'>): Promise<void> {
  return adminRpc('admin_update_machine', {
    p_machine_id: m.id,
    p_label: m.label,
    p_active: m.active,
    p_retired: m.retired,
  })
}

export function deleteBooking(id: string): Promise<void> {
  return adminRpc('admin_delete_booking', { p_booking_id: id })
}
