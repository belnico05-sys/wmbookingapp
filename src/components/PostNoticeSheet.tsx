import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Booking, Machine } from '../lib/types'
import { machineName } from '../lib/machines'
import { isValidNoticeMessage, NOTICE_ICON, NOTICE_MAX_LENGTH, type NoticeKind } from '../lib/notices'
import { NoticeError } from '../api/notices'
import { postMyNotice } from '../auth/identity'
import { Sheet } from './ui/Sheet'
import { SlotPill } from './SlotPill'
import { errorBoxClass, inputClass, primaryButtonClass, secondaryButtonClass } from './ui/styles'

interface Props {
  booking: Booking
  machine: Machine | undefined
  onClose: () => void
  onPosted: () => void
}

const KINDS: NoticeKind[] = ['late', 'early', 'custom']

/** Pick "finishing late" / "finished early" / a free message, then publish it. */
export function PostNoticeSheet({ booking, machine, onClose, onPosted }: Props) {
  const { t } = useTranslation()
  const [kind, setKind] = useState<NoticeKind>('late')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSend = !busy && (kind !== 'custom' || isValidNoticeMessage(message))

  async function send() {
    setBusy(true)
    setError(null)
    try {
      await postMyNotice(booking.id, kind, kind === 'custom' ? message.trim() : null)
      onPosted()
      onClose()
    } catch (e) {
      const code = e instanceof NoticeError ? e.code : 'generic'
      setError(t(`notices.errors.${code}`))
      setBusy(false)
    }
  }

  return (
    <Sheet onClose={onClose}>
      <h2 className="text-lg font-bold text-brand-900 dark:text-slate-100">{t('notices.post.title')}</h2>
      <p className="mt-1 text-sm font-semibold text-brand-700 dark:text-slate-300">
        {machine ? machineName(t, machine) : `#${booking.machineId}`}
      </p>
      <SlotPill start={booking.slotStart} />

      <div className="mt-4 flex flex-col gap-2" role="radiogroup" aria-label={t('notices.post.title')}>
        {KINDS.map((k) => (
          <button
            key={k}
            role="radio"
            aria-checked={kind === k}
            onClick={() => setKind(k)}
            className={`rounded-xl p-3 text-left text-sm font-semibold ring-1 transition ${
              kind === k
                ? 'bg-brand-600 text-white ring-brand-600'
                : 'bg-brand-50 text-brand-900 ring-brand-200 hover:ring-brand-400 dark:bg-white/[0.04] dark:text-slate-100 dark:ring-white/15'
            }`}
          >
            <span aria-hidden="true">{NOTICE_ICON[k]} </span>
            {t(`notices.post.options.${k}`)}
          </button>
        ))}
      </div>

      {kind === 'custom' && (
        <div className="mt-3">
          <textarea
            className={`${inputClass} w-full resize-none`}
            rows={2}
            maxLength={NOTICE_MAX_LENGTH}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t('notices.post.placeholder')}
            aria-label={t('notices.post.options.custom')}
            autoFocus
          />
          <p className="text-right text-xs text-brand-400 dark:text-slate-400">
            {t('notices.post.counter', { count: message.trim().length, max: NOTICE_MAX_LENGTH })}
          </p>
        </div>
      )}

      <p className="mt-3 text-xs text-brand-500 dark:text-slate-400">{t('notices.post.hint')}</p>

      {error && <p className={`mt-3 ${errorBoxClass}`}>{error}</p>}

      <div className="mt-4 flex gap-2.5">
        <button className={`flex-1 ${secondaryButtonClass}`} onClick={onClose}>
          {t('booking.close')}
        </button>
        <button className={`flex-1 ${primaryButtonClass}`} disabled={!canSend} onClick={send}>
          {busy ? t('notices.post.sending') : t('notices.post.send')}
        </button>
      </div>
    </Sheet>
  )
}
