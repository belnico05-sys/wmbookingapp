// Calendar reminder helpers. A web app cannot set a native phone alarm, but a
// calendar event with a VALARM is the universal equivalent: an .ics file works
// on iOS/Android/desktop, and the Google Calendar URL covers one-tap add.

interface CalendarEvent {
  title: string
  description: string
  start: Date
  end: Date
}

/** UTC timestamp in iCalendar basic format: YYYYMMDDTHHMMSSZ. */
function toIcsUtc(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

/** Escape text per RFC 5545 (commas, semicolons, newlines). */
function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/[,;]/g, '\\$&').replace(/\n/g, '\\n')
}

export function buildIcs({ title, description, start, end }: CalendarEvent): string {
  const uid = `${start.getTime()}-${Math.random().toString(36).slice(2)}@lavatrici`
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Lavatrici//Prenotazioni//IT',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${toIcsUtc(new Date())}`,
    `DTSTART:${toIcsUtc(start)}`,
    `DTEND:${toIcsUtc(end)}`,
    `SUMMARY:${escapeText(title)}`,
    `DESCRIPTION:${escapeText(description)}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText(title)}`,
    'TRIGGER:-PT10M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

export function downloadIcs(event: CalendarEvent, filename = 'prenotazione.ics'): void {
  const blob = new Blob([buildIcs(event)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Give the click handler a tick before revoking on iOS Safari.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function googleCalendarUrl({ title, description, start, end }: CalendarEvent): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    details: description,
    dates: `${toIcsUtc(start)}/${toIcsUtc(end)}`,
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}
