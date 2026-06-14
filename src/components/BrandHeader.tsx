import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  /** Left-side element (e.g. a back button). Logo+title show when absent. */
  left?: ReactNode
  /** Right-side actions. */
  right?: ReactNode
}

export function BrandHeader({ left, right }: Props) {
  const { t } = useTranslation()

  return (
    <header className="sticky top-0 z-20 bg-brand-700 text-white shadow-lg shadow-brand-900/20 dark:bg-brand-800">
      <div className="mx-auto flex max-w-md items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {left ?? (
            <img
              src="/logo-128.png"
              alt=""
              className="h-10 w-10 shrink-0 rounded-2xl object-cover ring-1 ring-white/30"
            />
          )}
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold leading-tight">{t('app.title')}</h1>
            <p className="truncate text-xs text-brand-100">{t('app.subtitle')}</p>
          </div>
        </div>
        {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
      </div>
    </header>
  )
}
