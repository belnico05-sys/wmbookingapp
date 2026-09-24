import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  dayRange,
  firstSelectableDay,
  isDaySelectable,
  isSlotOver,
  lastSelectableDay,
  slotsForDay,
} from './slots'
import { SLOT_MINUTES, type BookingRules } from './config'

const HOUR = 60 * 60 * 1000

// This residence's defaults; the admin can change them per residence.
const RULES: BookingRules = { firstSlotHour: 8, lastSlotHour: 22, windowDays: 30 }

describe('slotsForDay', () => {
  it('returns one slot per hour from the first to the last slot hour', () => {
    const slots = slotsForDay(new Date(2026, 8, 24), RULES)
    expect(slots).toHaveLength(15)
    expect(slots[0].start.getHours()).toBe(8)
    expect(slots.at(-1)!.start.getHours()).toBe(22)
    for (const s of slots) {
      expect(s.start.getMinutes()).toBe(0)
      expect(s.end.getTime() - s.start.getTime()).toBe(SLOT_MINUTES * 60_000)
    }
  })

  it.each([
    ['clocks go back', new Date(2026, 9, 25)],
    ['clocks go forward', new Date(2026, 2, 29)],
  ])('keeps local hours on the day the %s', (_, day) => {
    const hours = slotsForDay(day, RULES).map((s) => s.start.getHours())
    expect(hours[0]).toBe(RULES.firstSlotHour)
    expect(hours.at(-1)).toBe(RULES.lastSlotHour)
    expect(new Set(hours).size).toBe(hours.length)
  })
})

describe('slotsForDay with other opening hours', () => {
  it("uses the residence's first and last hour", () => {
    const hours = slotsForDay(new Date(2026, 8, 24), { ...RULES, firstSlotHour: 7, lastSlotHour: 20 })
      .map((s) => s.start.getHours())
    expect(hours).toEqual([7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20])
  })
})

describe('isSlotOver', () => {
  const [slot] = slotsForDay(new Date(2026, 8, 24), RULES)

  it('is false while the slot is running', () => {
    expect(isSlotOver(slot, new Date(slot.start.getTime() + HOUR / 2))).toBe(false)
  })

  it('is true once the slot has ended', () => {
    expect(isSlotOver(slot, slot.end)).toBe(true)
  })
})

describe('dayRange', () => {
  it('spans local midnight to the next midnight', () => {
    const { from, to } = dayRange(new Date(2026, 8, 24, 15, 30))
    expect(from).toEqual(new Date(2026, 8, 24))
    expect(to).toEqual(new Date(2026, 8, 25))
  })

  it('is 25 hours long on the day the clocks go back', () => {
    const { from, to } = dayRange(new Date(2026, 9, 25))
    expect(to.getTime() - from.getTime()).toBe(25 * HOUR)
  })
})

describe('booking window', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date(2026, 8, 24, 15, 0) })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts today and ends windowDays later', () => {
    expect(firstSelectableDay()).toEqual(new Date(2026, 8, 24))
    expect(lastSelectableDay(RULES)).toEqual(new Date(2026, 8, 24 + 30))
  })

  it('accepts only days inside the window', () => {
    expect(isDaySelectable(new Date(2026, 8, 23), RULES)).toBe(false)
    expect(isDaySelectable(new Date(2026, 8, 24, 23, 59), RULES)).toBe(true)
    expect(isDaySelectable(new Date(2026, 8, 24 + 30), RULES)).toBe(true)
    expect(isDaySelectable(new Date(2026, 8, 24 + 31), RULES)).toBe(false)
  })

  it("follows a different residence's window", () => {
    const shortWindow = { ...RULES, windowDays: 7 }
    expect(isDaySelectable(new Date(2026, 9, 1), shortWindow)).toBe(true) // 24 Sep + 7
    expect(isDaySelectable(new Date(2026, 9, 2), shortWindow)).toBe(false)
  })
})
