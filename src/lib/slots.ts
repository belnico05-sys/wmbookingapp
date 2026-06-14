import { FIRST_SLOT_HOUR, LAST_SLOT_HOUR, SLOT_MINUTES, WINDOW_DAYS } from './config'

export interface Slot {
  start: Date
  end: Date
}

/** Local midnight of the given date. */
export function dayStart(day: Date): Date {
  const d = new Date(day)
  d.setHours(0, 0, 0, 0)
  return d
}

/** The first selectable day (today, local). */
export function firstSelectableDay(): Date {
  return dayStart(new Date())
}

/** The last selectable day (today + WINDOW_DAYS). */
export function lastSelectableDay(): Date {
  const d = firstSelectableDay()
  d.setDate(d.getDate() + WINDOW_DAYS)
  return d
}

/** Whether a day falls inside the bookable window [today, today + WINDOW_DAYS]. */
export function isDaySelectable(day: Date): boolean {
  const d = dayStart(day).getTime()
  return d >= firstSelectableDay().getTime() && d <= lastSelectableDay().getTime()
}

/** The bookable days: today through today + WINDOW_DAYS (inclusive). */
export function bookableDays(): Date[] {
  const today = firstSelectableDay()
  return Array.from({ length: WINDOW_DAYS + 1 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    return d
  })
}

/** All slots of the given day, first to last. */
export function slotsForDay(day: Date): Slot[] {
  const slots: Slot[] = []
  for (let hour = FIRST_SLOT_HOUR; hour <= LAST_SLOT_HOUR; hour++) {
    const start = dayStart(day)
    start.setHours(hour)
    const end = new Date(start.getTime() + SLOT_MINUTES * 60 * 1000)
    slots.push({ start, end })
  }
  return slots
}

/** A slot can no longer be booked once it has fully ended. */
export function isSlotOver(slot: Slot, now: Date = new Date()): boolean {
  return slot.end.getTime() <= now.getTime()
}

/** Day boundaries for querying bookings of one day. */
export function dayRange(day: Date): { from: Date; to: Date } {
  const from = dayStart(day)
  const to = new Date(from)
  to.setDate(to.getDate() + 1)
  return { from, to }
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}
