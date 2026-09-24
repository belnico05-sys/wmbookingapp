// Domain types used across the app. The api layer (src/api/) converts
// database rows (snake_case columns) into these, so components never deal
// with column names.

export interface Machine {
  id: number
  /** Stable identifier, also the i18n key suffix: t(`machines.${code}`). */
  code: string
  type: 'washer' | 'dryer'
  location: 'internal' | 'external'
  active: boolean
}

/** A booking as shown on the public schedule. */
export interface Booking {
  id: string
  machineId: number
  slotStart: Date
  name: string
  apartment: string
  note: string | null
}
