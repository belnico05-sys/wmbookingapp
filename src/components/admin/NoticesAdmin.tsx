import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Machine, Notice } from '../../lib/types'
import { machineName } from '../../lib/machines'
import { NOTICE_ICON, noticeText } from '../../lib/notices'
import { deleteNotice, updateSettings } from '../../api/admin'
import { useActiveNotices } from '../../hooks/useActiveNotices'
import { useResidence } from '../../residence/useResidence'
import { ConfirmSheet } from '../ui/ConfirmSheet'
import { SlotPill } from '../SlotPill'
import { cardClass, errorBoxClass, primaryButtonClass, secondaryButtonClass } from '../ui/styles'

interface Props {
  /** All machines, retired ones included (to name every notice). */
  machines: Machine[]
  onChanged: () => void
}

/** The notice board's on/off switch and the list of active notices (with delete). */
export function NoticesAdmin({ machines, onChanged }: Props) {
  const { t } = useTranslation()
  const { settings } = useResidence()
  const enabled = settings.noticesEnabled
  const { notices, reload } = useActiveNotices(enabled)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const [toDelete, setToDelete] = useState<Notice | null>(null)

  async function toggle() {
    setBusy(true)
    setFailed(false)
    try {
      await updateSettings({ ...settings, noticesEnabled: !enabled })
      onChanged()
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  const name = (id: number) => {
    const m = machines.find((x) => x.id === id)
    return m ? machineName(t, m) : `#${id}`
  }

  return (
    <section className={`flex flex-col gap-3 ${cardClass}`}>
      <h3 className="font-bold text-brand-900 dark:text-slate-100">{t('admin.notices.title')}</h3>
      <p className="text-sm text-brand-600 dark:text-slate-300">
        {enabled ? t('admin.notices.stateOn') : t('admin.notices.stateOff')}
      </p>
      <button
        className={enabled ? secondaryButtonClass : primaryButtonClass}
        disabled={busy}
        onClick={toggle}
      >
        {busy ? t('admin.saving') : enabled ? t('admin.notices.disable') : t('admin.notices.enable')}
      </button>
      {failed && <p className={errorBoxClass}>{t('admin.saveFailed')}</p>}

      {enabled && notices.length === 0 && (
        <p className="text-sm text-brand-400 dark:text-slate-400">{t('admin.notices.empty')}</p>
      )}
      {enabled && notices.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {notices.map((n) => (
            <li
              key={n.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-brand-50 p-2.5 text-sm ring-1 ring-brand-100 dark:bg-white/[0.04] dark:ring-white/10"
            >
              <span className="min-w-0 text-brand-900 dark:text-slate-100">
                <span className="font-semibold">{name(n.machineId)}</span>
                <br />
                {NOTICE_ICON[n.kind]} {noticeText(t, n.kind, n.message)}{' '}
                <span className="text-brand-500 dark:text-slate-400">{t('notices.by', { name: n.name })}</span>
              </span>
              <button
                onClick={() => setToDelete(n)}
                className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold text-accent-600 ring-1 ring-accent-600/40 transition hover:bg-accent-600 hover:text-white dark:text-accent-100 dark:ring-accent-100/30"
              >
                {t('admin.notices.delete')}
              </button>
            </li>
          ))}
        </ul>
      )}

      {toDelete && (
        <ConfirmSheet
          title={t('admin.notices.confirmTitle')}
          confirmLabel={t('admin.notices.confirm')}
          busyLabel={t('admin.notices.deleting')}
          keepLabel={t('admin.notices.keep')}
          errorText={t('admin.saveFailed')}
          onConfirm={async () => {
            await deleteNotice(toDelete.id)
            reload()
          }}
          onClose={() => setToDelete(null)}
        >
          <p className="mt-1 text-sm font-semibold text-brand-700 dark:text-slate-300">
            {name(toDelete.machineId)}
          </p>
          <SlotPill start={toDelete.slotStart} />
          <p className="mt-3 text-sm text-brand-700 dark:text-slate-300">
            {NOTICE_ICON[toDelete.kind]} {noticeText(t, toDelete.kind, toDelete.message)}{' '}
            {t('notices.by', { name: toDelete.name })}
          </p>
        </ConfirmSheet>
      )}
    </section>
  )
}
