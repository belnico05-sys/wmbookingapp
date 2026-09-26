import { useTranslation } from 'react-i18next'
import type { Notice } from '../lib/types'
import { SLOT_MINUTES } from '../lib/config'
import { formatTime } from '../lib/format'
import { machineName } from '../lib/machines'
import { isNoticeActive, NOTICE_ICON, noticeText } from '../lib/notices'
import { useResidence } from '../residence/useResidence'

interface Props {
  notices: Notice[]
}

/** "Bacheca": today's notices about running late / finishing early. Hidden when empty. */
export function NoticeBoard({ notices }: Props) {
  const { t, i18n } = useTranslation()
  const { machines } = useResidence()
  const active = notices.filter((n) => isNoticeActive(n.slotStart))
  if (active.length === 0) return null

  return (
    <section className="mt-5 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:ring-amber-500/30">
      <h2 className="text-sm font-bold uppercase tracking-wide text-amber-900 dark:text-amber-200">
        📢 {t('notices.boardTitle')}
      </h2>
      <ul className="mt-2 flex flex-col gap-2">
        {active.map((n) => {
          const machine = machines.find((m) => m.id === n.machineId)
          const end = new Date(n.slotStart.getTime() + SLOT_MINUTES * 60_000)
          return (
            <li key={n.id} className="text-sm text-amber-950 dark:text-amber-50">
              <span className="font-semibold">
                {machine ? machineName(t, machine) : `#${n.machineId}`} ·{' '}
                {t('slots.range', {
                  start: formatTime(n.slotStart, i18n.language),
                  end: formatTime(end, i18n.language),
                })}
              </span>
              <br />
              <span aria-hidden="true">{NOTICE_ICON[n.kind]} </span>
              {noticeText(t, n.kind, n.message)}{' '}
              <span className="text-amber-700 dark:text-amber-300/80">
                {t('notices.by', { name: n.name })}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
