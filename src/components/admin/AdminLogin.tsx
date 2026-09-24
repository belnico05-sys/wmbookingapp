import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { signIn } from '../../api/admin'
import { cardClass, errorBoxClass, inputClass, labelClass, primaryButtonClass } from '../ui/styles'

/** Email + password form. On success useAdminSession picks up the new session. */
export function AdminLogin() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setFailed(false)
    const ok = await signIn(email.trim(), password)
    setBusy(false)
    if (!ok) setFailed(true)
  }

  return (
    <form onSubmit={submit} className={`mt-4 flex flex-col gap-3 ${cardClass}`}>
      <h3 className="font-bold text-brand-900 dark:text-slate-100">{t('admin.signIn.title')}</h3>
      <label className={labelClass}>
        {t('admin.signIn.email')}
        <input
          className={inputClass}
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className={labelClass}>
        {t('admin.signIn.password')}
        <input
          className={inputClass}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {failed && <p className={errorBoxClass}>{t('admin.signIn.failed')}</p>}
      <button
        type="submit"
        className={primaryButtonClass}
        disabled={busy || !email.trim() || !password}
      >
        {busy ? t('admin.signIn.sending') : t('admin.signIn.submit')}
      </button>
    </form>
  )
}
