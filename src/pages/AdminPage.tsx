import { useTranslation } from 'react-i18next'
import { signOut } from '../api/admin'
import { useAdminSession } from '../hooks/useAdminSession'
import { BrandHeader } from '../components/BrandHeader'
import { BackButton } from '../components/BackButton'
import { AdminLogin } from '../components/admin/AdminLogin'
import { AdminPanel } from '../components/admin/AdminPanel'

/** /#/admin: the manager's login, then the residence settings, machines and bookings. */
export function AdminPage() {
  const { t } = useTranslation()
  const { status, email } = useAdminSession()
  const signedIn = status === 'admin' || status === 'notAdmin'

  return (
    <div className="min-h-screen pb-12">
      <BrandHeader
        left={<BackButton label={t('common.back')} />}
        right={
          signedIn && (
            <button
              onClick={signOut}
              className="rounded-full bg-white/15 px-3.5 py-1.5 text-sm font-semibold transition hover:bg-white/25"
            >
              {t('admin.signOut')}
            </button>
          )
        }
      />

      <main className="mx-auto max-w-md px-4">
        <h2 className="mt-5 text-xl font-bold text-brand-900 dark:text-slate-100">
          {t('admin.title')}
        </h2>
        {email && (
          <p className="text-sm text-brand-500 dark:text-slate-400">{email}</p>
        )}

        {status === 'loading' && (
          <p className="mt-4 text-sm text-brand-500">{t('common.loading')}</p>
        )}
        {status === 'signedOut' && <AdminLogin />}
        {status === 'notAdmin' && (
          <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900">
            {t('admin.notAdmin')}
          </p>
        )}
        {status === 'admin' && <AdminPanel />}
      </main>
    </div>
  )
}
