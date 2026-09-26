import { beforeEach, describe, expect, it, vi } from 'vitest'

// The database is faked: tests say which booking ids "still exist".
const existing = vi.hoisted(() => ({ ids: new Set<string>(), fail: false, onCall: () => {} }))
vi.mock('../api/bookings', () => ({
  fetchExistingBookingIds: async (ids: string[]) => {
    existing.onCall()
    if (existing.fail) throw new Error('offline')
    return new Set(ids.filter((id) => existing.ids.has(id)))
  },
  cancelBooking: vi.fn(),
  createBooking: vi.fn(),
}))
vi.mock('../api/notices', () => ({ postNotice: vi.fn(), registerPush: vi.fn(), requestPushSend: vi.fn() }))

const { myUpcomingBookings, syncMyBookings } = await import('./identity')

const KEY = 'lavatrici.myBookings'
const inHours = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString()
const stored = (id: string, slotStart: string) => ({ id, cancelToken: 't', machineId: 1, slotStart })
const ids = () => (JSON.parse(localStorage.getItem(KEY) ?? '[]') as { id: string }[]).map((b) => b.id)

beforeEach(() => {
  const data = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => data.set(k, v),
  })
  existing.ids = new Set()
  existing.fail = false
  existing.onCall = () => {}
})

describe('syncMyBookings', () => {
  it('forgets bookings deleted from the database (e.g. by the admin)', async () => {
    localStorage.setItem(KEY, JSON.stringify([stored('kept', inHours(5)), stored('deleted', inHours(6))]))
    existing.ids = new Set(['kept'])
    expect(await syncMyBookings()).toBe(true)
    expect(myUpcomingBookings().map((b) => b.id)).toEqual(['kept'])
  })

  it('changes nothing when the database cannot be reached', async () => {
    localStorage.setItem(KEY, JSON.stringify([stored('a', inHours(5))]))
    existing.fail = true
    expect(await syncMyBookings()).toBe(false)
    expect(ids()).toEqual(['a'])
  })

  it('drops bookings whose slot ended more than a day ago', async () => {
    localStorage.setItem(KEY, JSON.stringify([stored('old', inHours(-30)), stored('new', inHours(5))]))
    existing.ids = new Set(['old', 'new'])
    await syncMyBookings()
    expect(ids()).toEqual(['new'])
  })

  it('keeps a booking made while the check was running', async () => {
    localStorage.setItem(KEY, JSON.stringify([stored('a', inHours(5))]))
    existing.ids = new Set(['a'])
    existing.onCall = () => {
      const now = JSON.parse(localStorage.getItem(KEY)!)
      localStorage.setItem(KEY, JSON.stringify([...now, stored('made-meanwhile', inHours(7))]))
    }
    await syncMyBookings()
    expect(ids()).toEqual(['a', 'made-meanwhile'])
  })
})
