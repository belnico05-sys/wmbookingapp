import type { ReactNode } from 'react'

interface Props {
  /** Called when the user taps the dimmed backdrop. */
  onClose: () => void
  children: ReactNode
}

/** Bottom sheet on phones, centred dialog on wider screens. */
export function Sheet({ onClose, children }: Props) {
  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-brand-900/50 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl dark:bg-[#33374a] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-brand-200 dark:bg-white/20 sm:hidden" />
        {children}
      </div>
    </div>
  )
}
