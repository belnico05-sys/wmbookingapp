import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  dismissPushPrompt,
  enablePush,
  pushPromptDismissed,
  pushState,
  type PushState,
} from '../auth/push'
import { primaryButtonClass, secondaryButtonClass } from './ui/styles'

interface Props {
  /**
   * 'prompt': the invitation after booking / on the booking page. Only shown
   * while there is something to do and the user hasn't said "no thanks".
   * 'status': always shown (My bookings page), with the current state.
   */
  mode: 'prompt' | 'status'
}

/** Invitation to turn on notice-board notifications on this device. */
export function NotificationsCard({ mode }: Props) {
  const { t, i18n } = useTranslation()
  const [state, setState] = useState<PushState | null>(null)
  const [dismissed, setDismissed] = useState(pushPromptDismissed)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    pushState().then(setState)
  }, [])

  async function enable() {
    setBusy(true)
    setFailed(false)
    const ok = await enablePush(i18n.language).catch(() => false)
    setBusy(false)
    if (!ok) setFailed(true)
    setState(await pushState())
  }

  if (!state) return null
  if (mode === 'prompt' && (dismissed || state === 'enabled' || state === 'unsupported' || state === 'blocked')) {
    return null
  }

  const box =
    mode === 'prompt'
      ? 'rounded-2xl bg-brand-50 p-4 text-left ring-1 ring-brand-200 dark:bg-white/[0.06] dark:ring-white/10'
      : 'mt-6 rounded-2xl bg-white p-4 ring-1 ring-brand-100 dark:bg-white/[0.06] dark:ring-white/10'

  return (
    <section className={box}>
      <h3 className="text-sm font-bold text-brand-900 dark:text-slate-100">🔔 {t('notices.push.title')}</h3>

      {state === 'enabled' && (
        <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">{t('notices.push.enabled')}</p>
      )}
      {state === 'blocked' && (
        <p className="mt-1 text-sm text-brand-600 dark:text-slate-300">{t('notices.push.blocked')}</p>
      )}
      {state === 'unsupported' && (
        <p className="mt-1 text-sm text-brand-600 dark:text-slate-300">{t('notices.push.unsupported')}</p>
      )}
      {state === 'needsInstall' && (
        <p className="mt-1 text-sm text-brand-600 dark:text-slate-300">{t('notices.push.needsInstall')}</p>
      )}

      {state === 'available' && (
        <>
          <p className="mt-1 text-sm text-brand-600 dark:text-slate-300">{t('notices.push.body')}</p>
          {failed && (
            <p className="mt-2 text-sm font-medium text-accent-600 dark:text-accent-100">
              {t('notices.push.failed')}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            {mode === 'prompt' && (
              <button
                className={`flex-1 ${secondaryButtonClass} py-2`}
                onClick={() => {
                  dismissPushPrompt()
                  setDismissed(true)
                }}
              >
                {t('notices.push.dismiss')}
              </button>
            )}
            <button className={`flex-1 ${primaryButtonClass} py-2`} disabled={busy} onClick={enable}>
              {busy ? t('notices.push.enabling') : t('notices.push.enable')}
            </button>
          </div>
        </>
      )}

      {state === 'needsInstall' && mode === 'prompt' && (
        <button
          className={`mt-3 w-full ${secondaryButtonClass} py-2`}
          onClick={() => {
            dismissPushPrompt()
            setDismissed(true)
          }}
        >
          {t('notices.push.dismiss')}
        </button>
      )}
    </section>
  )
}
