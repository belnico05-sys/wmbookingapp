import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Machine } from '../lib/types'
import { SLOT_MINUTES } from '../lib/config'
import { db } from '../lib/supabase'
import { getMyBookings, removeMyBooking, type MyBooking } from '../lib/myBookings'
import { formatDayLong, formatTime } from '../lib/format'

interface Props {
  machines: Machine[]
  /** Bumped by the parent whenever a booking is added, to reload the list. */
  reloadKey: number
  onChanged: () => void
}

/** Bookings whose slot has not fully ended yet. */
function futureBookings(): MyBooking[] {
  const now = Date.now()
  return getMyBookings()
    .filter((b) => new Date(b.slotStart).getTime() + SLOT_MINUTES * 60_000 > now)
    .sort((a, b) => a.slotStart.localeCompare(b.slotStart))
}

export function MyBookings({ machines, reloadKey, onChanged }: Props) {
  const { t, i18n } = useTranslation()
  const [list, setList] = useState<MyBooking[]>(futureBookings)

  useEffect(() => {
    setList(futureBookings())
  }, [reloadKey])

  async function cancel(b: MyBooking) {
    if (!window.confirm(t('myBookings.cancelConfirm'))) return
    const { data, error } = await db().rpc('cancel_booking', {
      p_booking_id: b.id,
      p_cancel_token: b.cancelToken,
    })
    if (error || data !== true) {
      window.alert(t('myBookings.cancelFailed'))
      return
    }
    removeMyBooking(b.id)
    setList(futureBookings())
    onChanged()
  }

  return (
    <section className="mt-6">
      <h2 className="text-base font-semibold">{t('myBookings.title')}</h2>
      {list.length === 0 ? (
        <p className="mt-2 text-sm text-gray-500">{t('myBookings.empty')}</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {list.map((b) => {
            const start = new Date(b.slotStart)
            const end = new Date(start.getTime() + SLOT_MINUTES * 60_000)
            const machine = machines.find((m) => m.id === b.machineId)
            return (
              <li
                key={b.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 p-3 text-sm"
              >
                <span>
                  {machine ? t(`machines.${machine.code}`) : `#${b.machineId}`}
                  {' · '}
                  {formatDayLong(start, i18n.language)}
                  {' · '}
                  {formatTime(start, i18n.language)}–{formatTime(end, i18n.language)}
                </span>
                <button
                  className="rounded-lg border border-red-300 px-3 py-1 text-red-600"
                  onClick={() => cancel(b)}
                >
                  {t('myBookings.cancel')}
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <p className="mt-2 text-xs text-gray-400">{t('myBookings.deviceHint')}</p>
    </section>
  )
}
