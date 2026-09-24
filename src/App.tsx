import { lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { isSupabaseConfigured } from './api/client'
import { ResidenceProvider } from './residence/ResidenceProvider'
import { BookingPage } from './pages/BookingPage'
import { MyBookingsPage } from './pages/MyBookingsPage'

// Loaded only when someone opens /#/admin, so students don't download it.
const AdminPage = lazy(() => import('./pages/AdminPage').then((m) => ({ default: m.AdminPage })))

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

  return (
    <ResidenceProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<BookingPage />} />
          <Route path="/prenotazioni" element={<MyBookingsPage />} />
          {/* Not linked from the student UI: the manager bookmarks it. */}
          <Route
            path="/admin"
            element={
              <Suspense fallback={<p className="mx-auto max-w-md p-6 text-sm text-brand-500">{t('common.loading')}</p>}>
                <AdminPage />
              </Suspense>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </ResidenceProvider>
  )
}
