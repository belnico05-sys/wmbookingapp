// The Supabase client. Only the other files in src/api/ should import it:
// components and hooks call the functions in api/*.ts instead of building
// queries themselves.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && anonKey)

const client: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!)
  : null

/** Only call from code that runs after the configuration gate in App. */
export function db(): SupabaseClient {
  if (!client) throw new Error('Supabase is not configured (missing .env.local)')
  return client
}
