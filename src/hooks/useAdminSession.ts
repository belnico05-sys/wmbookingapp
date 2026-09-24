import { useEffect, useState } from 'react'
import { checkIsAdmin, onSessionChange } from '../api/admin'

export type AdminStatus = 'loading' | 'signedOut' | 'notAdmin' | 'admin'

/** Whether someone is signed in to the admin panel, and whether they are an admin. */
export function useAdminSession() {
  const [status, setStatus] = useState<AdminStatus>('loading')
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    // Counts session changes so a slow is_admin reply for an old session is ignored.
    let latest = 0
    return onSessionChange((session) => {
      const current = ++latest
      setEmail(session?.user.email ?? null)
      if (!session) {
        setStatus('signedOut')
        return
      }
      setStatus('loading')
      checkIsAdmin().then((ok) => {
        if (current === latest) setStatus(ok ? 'admin' : 'notAdmin')
      })
    })
  }, [])

  return { status, email }
}
