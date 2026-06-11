export function formatTime(d: Date, lang: string): string {
  return new Intl.DateTimeFormat(lang, { hour: '2-digit', minute: '2-digit' }).format(d)
}

export function formatDayShort(d: Date, lang: string): string {
  return new Intl.DateTimeFormat(lang, { weekday: 'short', day: 'numeric', month: 'short' }).format(d)
}

export function formatDayLong(d: Date, lang: string): string {
  return new Intl.DateTimeFormat(lang, { weekday: 'long', day: 'numeric', month: 'long' }).format(d)
}
