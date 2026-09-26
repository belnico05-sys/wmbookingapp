// This device's notification subscription (Web Push).
//
// Flow: the user taps "Enable notifications" → the browser asks permission →
// we subscribe through the service worker (public/push-handler.js shows the
// notifications) → the subscription is linked to the user's bookings via
// identity.registerPushForMyBookings. New bookings are linked by syncPush().
//
// iPhone: Safari only allows web notifications for apps added to the Home
// Screen (iOS 16.4+), hence the 'needsInstall' state.

import { registerPushForMyBookings } from './identity'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined
const CHOICE_KEY = 'lavatrici.pushChoice'

export type PushState =
  | 'enabled' // permission granted and subscribed
  | 'available' // can be enabled with a tap
  | 'blocked' // the user refused in the browser
  | 'needsInstall' // iPhone/iPad not opened from the Home Screen
  | 'unsupported'

function isIos(): boolean {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

/** The service worker registration, or null (e.g. in the dev server, which has none). */
async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  return (await navigator.serviceWorker.getRegistration()) ?? null
}

export async function pushState(): Promise<PushState> {
  const apis = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  if (isIos() && !isStandalone()) return 'needsInstall'
  if (!apis || !VAPID_PUBLIC_KEY) return 'unsupported'
  if (Notification.permission === 'denied') return 'blocked'
  if (Notification.permission === 'granted') {
    const reg = await registration()
    if (reg && (await reg.pushManager.getSubscription())) return 'enabled'
  }
  return (await registration()) ? 'available' : 'unsupported'
}

/** The user said "no thanks" to the prompt on this device. */
export function pushPromptDismissed(): boolean {
  try {
    return localStorage.getItem(CHOICE_KEY) === 'dismissed'
  } catch {
    return false
  }
}

export function dismissPushPrompt(): void {
  try {
    localStorage.setItem(CHOICE_KEY, 'dismissed')
  } catch {
    // Private mode etc.: the prompt will simply show again next time.
  }
}

// The Push API wants the public key as bytes, not base64url text.
function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  const raw = atob(base64)
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}

/**
 * Asks permission (must run from a tap) and subscribes this device.
 * Resolves true when notifications are on.
 */
export async function enablePush(lang: string): Promise<boolean> {
  if (!VAPID_PUBLIC_KEY) return false
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return false
  const reg = await registration()
  if (!reg) return false
  const subscription =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes(VAPID_PUBLIC_KEY),
    }))
  await registerPushForMyBookings(subscription.toJSON(), lang)
  return true
}

/** If notifications are already on, links them to the user's (new) bookings too. */
export async function syncPush(lang: string): Promise<void> {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const subscription = await (await registration())?.pushManager.getSubscription()
  if (subscription) await registerPushForMyBookings(subscription.toJSON(), lang)
}
