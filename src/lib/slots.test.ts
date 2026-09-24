import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  bookableDays,
  dayRange,
  firstSelectableDay,
  isDaySelectable,
  isSlotOver,
  lastSelectableDay,
  slotsForDay,
} from './slots'
import { FIRST_SLOT_HOUR, LAST_SLOT_HOUR, SLOT_MINUTES, WINDOW_DAYS } from './config'

const HOUR = 60 * 60 * 1000

describe('slotsForDay', () => {
  it('returns one slot per hour from the first to the last slot hour', () => {
    const slots = slotsForDay(new Date(2026, 8, 24))
    expect(slots).toHaveLength(LAST_SLOT_HOUR - FIRST_SLOT_HOUR + 1)
    expect(slots[0].start.getHours()).toBe(FIRST_SLOT_HOUR)
    expect(slots.at(-1)!.start.getHours()).toBe(LAST_SLOT_HOUR)
    for (const s of slots) {
      expect(s.start.getMinutes()).toBe(0)
      expect(s.end.getTime() - s.start.getTime()).toBe(SLOT_MINUTES * 60_000)
    }
  })

  it.each([
    ['clocks go back', new Date(2026, 9, 25)],
    ['clocks go forward', new Date(2026, 2, 29)],
  ])('keeps local hours on the day the %s', (_, day) => {
    const hours = slotsForDay(day).map((s) => s.start.getHours())
    expect(hours[0]).toBe(FIRST_SLOT_HOUR)
    expect(hours.at(-1)).toBe(LAST_SLOT_HOUR)
    expect(new Set(hours).size).toBe(hours.length)
  })
})

describe('isSlotOver', () => {
  const [slot] = slotsForDay(new Date(2026, 8, 24))

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

  it('starts today and ends WINDOW_DAYS later', () => {
    expect(firstSelectableDay()).toEqual(new Date(2026, 8, 24))
    expect(lastSelectableDay()).toEqual(new Date(2026, 8, 24 + WINDOW_DAYS))
    expect(bookableDays()).toHaveLength(WINDOW_DAYS + 1)
  })

  it('accepts only days inside the window', () => {
    expect(isDaySelectable(new Date(2026, 8, 23))).toBe(false)
    expect(isDaySelectable(new Date(2026, 8, 24, 23, 59))).toBe(true)
    expect(isDaySelectable(new Date(2026, 8, 24 + WINDOW_DAYS))).toBe(true)
    expect(isDaySelectable(new Date(2026, 8, 24 + WINDOW_DAYS + 1))).toBe(false)
  })
})
