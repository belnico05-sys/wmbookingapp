import { afterEach, describe, expect, it, vi } from 'vitest'
import { formatEuDate, monthGrid, selectableMonths } from './calendar'

describe('monthGrid', () => {
  // September 2026 starts on a Tuesday and has 30 days.
  const grid = monthGrid(2026, 8)

  it('builds full Monday-first weeks', () => {
    for (const week of grid.weeks) expect(week).toHaveLength(7)
    expect(grid.weeks[0][0]).toBeNull()
    expect(grid.weeks[0][1]).toEqual(new Date(2026, 8, 1))
  })

  it('contains every day of the month exactly once', () => {
    const days = grid.weeks.flat().filter((d) => d !== null)
    expect(days).toHaveLength(30)
    expect(days.at(-1)).toEqual(new Date(2026, 8, 30))
  })
})

describe('selectableMonths', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('covers every month touched by the booking window', () => {
    vi.useFakeTimers({ now: new Date(2026, 8, 24, 12, 0) })
    const rules = { firstSlotHour: 8, lastSlotHour: 22, windowDays: 30 }
    const months = selectableMonths(rules).map((m) => [m.year, m.month])
    expect(months).toEqual([
      [2026, 8],
      [2026, 9],
    ])
  })
})

describe('formatEuDate', () => {
  it('pads day and month', () => {
    expect(formatEuDate(new Date(2026, 0, 5))).toBe('05/01/2026')
  })
})
