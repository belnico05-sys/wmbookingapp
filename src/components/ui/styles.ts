// Tailwind class strings shared by forms and sheets, so every screen looks the
// same and a style change happens in one place.

export const inputClass =
  'rounded-xl bg-brand-50 p-2.5 text-brand-900 ring-1 ring-brand-200 outline-none placeholder:text-brand-300 focus:ring-2 focus:ring-brand-500 dark:bg-white/[0.06] dark:text-slate-100 dark:ring-white/15 dark:placeholder:text-slate-400'

export const labelClass =
  'flex flex-col gap-1 text-sm font-medium text-brand-800 dark:text-slate-200'

export const primaryButtonClass =
  'rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-brand-600/30 transition hover:bg-brand-700 disabled:opacity-40 disabled:shadow-none'

export const secondaryButtonClass =
  'rounded-xl px-4 py-3 text-sm font-semibold text-brand-700 ring-1 ring-brand-200 transition hover:bg-brand-50 disabled:opacity-40 dark:text-slate-200 dark:ring-white/15 dark:hover:bg-white/5'

export const dangerButtonClass =
  'rounded-xl bg-accent-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-accent-600/30 transition hover:bg-accent-700 disabled:opacity-40 disabled:shadow-none'

export const errorBoxClass =
  'rounded-xl bg-accent-100 px-3 py-2 text-sm font-medium text-accent-700 dark:bg-accent-700/20 dark:text-accent-100'

export const cardClass =
  'rounded-2xl bg-white p-4 ring-1 ring-brand-100 dark:bg-white/[0.06] dark:ring-white/10'
