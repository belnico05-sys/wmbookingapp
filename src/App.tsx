import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import type { Machine } from './lib/types'
import { isSupabaseConfigured, db } from './lib/supabase'
import { BookingPage } from './pages/BookingPage'
import { MyBookingsPage } from './pages/MyBookingsPage'

export default function App() {
  const { t } = useTranslation()

  if (!isSupabaseConfigured) {
    return (
      <main className="mx-auto max-w-md p-6">
        <h1 className="text-xl font-bold text-brand-700 dark:text-brand-200">
          {t('app.title')}
        </h1>
        <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900">
          {t('setup.notConfigured')}
        </p>
      </main>
    )
  }

  return <ConfiguredApp />
}

function ConfiguredApp() {
  const { t } = useTranslation()
  const [machines, setMachines] = useState<Machine[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    db()
      .from('machines')
      .select('*')
      .order('id')
      .then(({ data, error }) => {
        if (error) {
          setError(t('errors.loadFailed'))
          return
        }
        setMachines(data as Machine[])
      })
  }, [t])

  if (error) {
    return <p className="mx-auto max-w-md p-6 text-sm text-accent-600">{error}</p>
  }
  if (!machines) {
    return <p className="mx-auto max-w-md p-6 text-sm text-brand-500">{t('common.loading')}</p>
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<BookingPage machines={machines} />} />
        <Route path="/prenotazioni" element={<MyBookingsPage machines={machines} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
