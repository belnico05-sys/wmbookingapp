import { SLOT_MINUTES, type BookingRules } from './config'

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

/** The last selectable day (today + windowDays). */
export function lastSelectableDay(rules: BookingRules): Date {
  const d = firstSelectableDay()
  d.setDate(d.getDate() + rules.windowDays)
  return d
}

/** Whether a day falls inside the bookable window [today, today + windowDays]. */
export function isDaySelectable(day: Date, rules: BookingRules): boolean {
  const d = dayStart(day).getTime()
  return d >= firstSelectableDay().getTime() && d <= lastSelectableDay(rules).getTime()
}

/** All slots of the given day, first to last. */
export function slotsForDay(day: Date, rules: BookingRules): Slot[] {
  const slots: Slot[] = []
  for (let hour = rules.firstSlotHour; hour <= rules.lastSlotHour; hour++) {
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
