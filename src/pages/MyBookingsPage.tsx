import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { Machine } from '../lib/types'
import { BrandHeader } from '../components/BrandHeader'
import { MyBookings } from '../components/MyBookings'

interface Props {
  machines: Machine[]
}

export function MyBookingsPage({ machines }: Props) {
  const { t } = useTranslation()
  const [reloadKey, setReloadKey] = useState(0)

  return (
    <div className="min-h-screen pb-12">
      <BrandHeader
        left={
          <Link
            to="/"
            aria-label={t('common.back')}
            title={t('common.back')}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 transition hover:bg-white/25"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </Link>
        }
      />

      <main className="mx-auto max-w-md px-4">
        <MyBookings
          machines={machines}
          reloadKey={reloadKey}
          onChanged={() => setReloadKey((k) => k + 1)}
        />
      </main>
    </div>
  )
}
