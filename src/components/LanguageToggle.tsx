import { useTranslation } from 'react-i18next'

const LANGS = ['it', 'en'] as const

export function LanguageToggle() {
  const { i18n } = useTranslation()
  const current = i18n.language.startsWith('en') ? 'en' : 'it'

  return (
    <div className="flex shrink-0 gap-0.5 rounded-full bg-white/15 p-0.5">
      {LANGS.map((lng) => (
        <button
          key={lng}
          onClick={() => i18n.changeLanguage(lng)}
          className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase transition ${
            current === lng
              ? 'bg-white text-brand-700'
              : 'text-white/80 hover:text-white'
          }`}
        >
          {lng}
        </button>
      ))}
    </div>
  )
}
