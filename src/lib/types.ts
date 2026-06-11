export interface Machine {
  id: number
  code: string
  type: 'washer' | 'dryer'
  location: 'internal' | 'external'
  active: boolean
}

export interface Booking {
  id: string
  machine_id: number
  slot_start: string
  name: string
  apartment: string
  note: string | null
}
