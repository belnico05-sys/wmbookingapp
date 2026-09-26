import { useState, type ReactNode } from 'react'
import { Sheet } from './Sheet'
import { dangerButtonClass, errorBoxClass, secondaryButtonClass } from './styles'

interface Props {
  title: string
  /** Details shown under the title (what is about to be deleted). */
  children?: ReactNode
  confirmLabel: string
  busyLabel: string
  keepLabel: string
  /** Shown if onConfirm throws. */
  errorText: string
  /** The action; the sheet closes itself when it succeeds. */
  onConfirm: () => Promise<void>
  onClose: () => void
}

/** "Are you sure?" sheet for destructive actions, with busy and error states. */
export function ConfirmSheet({
  title,
  children,
  confirmLabel,
  busyLabel,
  keepLabel,
  errorText,
  onConfirm,
  onClose,
}: Props) {
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  async function confirm() {
    setBusy(true)
    setFailed(false)
    try {
      await onConfirm()
      onClose()
    } catch {
      setFailed(true)
      setBusy(false)
    }
  }

  return (
    <Sheet onClose={onClose}>
      <h2 className="text-lg font-bold text-brand-900 dark:text-slate-100">{title}</h2>
      {children}

      {failed && <p className={`mt-4 ${errorBoxClass}`}>{errorText}</p>}

      <div className="mt-5 flex gap-2.5">
        <button className={`flex-1 ${secondaryButtonClass}`} onClick={onClose}>
          {keepLabel}
        </button>
        <button className={`flex-1 ${dangerButtonClass}`} disabled={busy} onClick={confirm}>
          {busy ? busyLabel : confirmLabel}
        </button>
      </div>
    </Sheet>
  )
}
