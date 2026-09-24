import { Link } from 'react-router-dom'

interface Props {
  /** Accessible label (already translated). */
  label: string
}

/** Header "‹" button back to the booking page. */
export function BackButton({ label }: Props) {
  return (
    <Link
      to="/"
      aria-label={label}
      title={label}
      className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 transition hover:bg-white/25"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M15 5l-7 7 7 7" />
      </svg>
    </Link>
  )
}
