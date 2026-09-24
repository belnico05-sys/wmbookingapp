import { useTranslation } from 'react-i18next'
import { BrandHeader } from '../components/BrandHeader'
import { BackButton } from '../components/BackButton'
import { MyBookings } from '../components/MyBookings'

/** The user's upcoming bookings (reached from the 📋 button). */
export function MyBookingsPage() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen pb-12">
      <BrandHeader left={<BackButton label={t('common.back')} />} />

      <main className="mx-auto max-w-md px-4">
        <MyBookings />
      </main>
    </div>
  )
}
