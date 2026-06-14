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
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 text-xl transition hover:bg-white/25"
          >
            <span aria-hidden="true">←</span>
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
