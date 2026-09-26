import { useTranslation } from 'react-i18next'
import { BrandHeader } from '../components/BrandHeader'
import { BackButton } from '../components/BackButton'
import { MyBookings } from '../components/MyBookings'
import { NotificationsCard } from '../components/NotificationsCard'
import { useResidence } from '../residence/useResidence'

/** The user's upcoming bookings (reached from the 📋 button). */
export function MyBookingsPage() {
  const { t } = useTranslation()
  const { noticesEnabled } = useResidence().settings

  return (
    <div className="min-h-screen pb-12">
      <BrandHeader left={<BackButton label={t('common.back')} />} />

      <main className="mx-auto max-w-md px-4">
        <MyBookings />
        {noticesEnabled && <NotificationsCard mode="status" />}
      </main>
    </div>
  )
}
