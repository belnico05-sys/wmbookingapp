import { useTranslation } from 'react-i18next'

const LANGS = ['it', 'en'] as const

export function LanguageToggle() {
  const { i18n } = useTranslation()
  const current = i18n.language.startsWith('en') ? 'en' : 'it'

  return (
    <div className="flex gap-1">
      {LANGS.map((lng) => (
        <button
          key={lng}
          onClick={() => i18n.changeLanguage(lng)}
          className={`rounded px-2 py-1 text-xs uppercase ${
            current === lng ? 'bg-sky-600 text-white' : 'bg-gray-100 text-gray-600'
          }`}
        >
          {lng}
        </button>
      ))}
    </div>
  )
}
