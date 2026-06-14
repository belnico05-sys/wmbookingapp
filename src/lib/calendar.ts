import { dayStart, firstSelectableDay, lastSelectableDay } from './slots'

export interface MonthGrid {
  year: number
  month: number // 0-based
  /** Weeks of 7 cells, Monday-first; null = padding day from an adjacent month. */
  weeks: (Date | null)[][]
}

/** Monday-first weekday index (0 = Monday … 6 = Sunday) for a JS Date. */
function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7
}

/** Build a Monday-first grid of the given month. */
export function monthGrid(year: number, month: number): MonthGrid {
  const first = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const lead = mondayIndex(first)

  const cells: (Date | null)[] = []
  for (let i = 0; i < lead; i++) cells.push(null)
  for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(year, month, day))
  while (cells.length % 7 !== 0) cells.push(null)

  const weeks: (Date | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  return { year, month, weeks }
}

/** The months (current … last selectable) that the calendar should display. */
export function selectableMonths(): MonthGrid[] {
  const start = firstSelectableDay()
  const end = lastSelectableDay()
  const grids: MonthGrid[] = []
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1)
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1)
  while (cursor.getTime() <= endMonth.getTime()) {
    grids.push(monthGrid(cursor.getFullYear(), cursor.getMonth()))
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return grids
}

/** Monday-first weekday labels localised via Intl (e.g. lun, mar …). */
export function weekdayLabels(lang: string): string[] {
  const fmt = new Intl.DateTimeFormat(lang, { weekday: 'short' })
  // 2024-01-01 is a Monday — walk 7 days from it.
  return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2024, 0, 1 + i)))
}

/** dd/mm/yyyy (EU style). */
export function formatEuDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return `${day}/${month}/${d.getFullYear()}`
}

export { dayStart }
