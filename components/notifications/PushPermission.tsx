'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type PushState = 'loading' | 'unsupported' | 'granted' | 'denied' | 'default'

export default function PushPermission() {
  const [state, setState] = useState<PushState>('loading')
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported')
      return
    }
    setState(Notification.permission as PushState)
  }, [])

  async function handleEnable() {
    setWorking(true)
    setError(null)
    try {
      const permission = await Notification.requestPermission()
      setState(permission as PushState)
      if (permission !== 'granted') return

      const registration = await navigator.serviceWorker.ready
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey || vapidKey.startsWith('your_')) {
        setError('Push notifications not configured yet — VAPID keys missing.')
        return
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as ArrayBuffer,
      })

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription }),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not enable notifications.')
    } finally {
      setWorking(false)
    }
  }

  async function handleDisable() {
    setWorking(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        })
        await subscription.unsubscribe()
      }
      setState('default')
    } catch { /* ignore */ } finally {
      setWorking(false)
    }
  }

  if (state === 'loading' || state === 'unsupported') return null

  if (state === 'granted') {
    return (
      <div className="flex items-center justify-between px-4 py-3 bg-green-50 border border-green-200 rounded-2xl">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔔</span>
          <div>
            <p className="text-sm font-semibold text-green-800">Push notifications on</p>
            <p className="text-xs text-green-600">You'll be notified on your phone</p>
          </div>
        </div>
        <button
          onClick={handleDisable}
          disabled={working}
          className="text-xs text-stone-warm-500 hover:text-red-500 transition-colors font-medium"
        >
          {working ? '...' : 'Turn off'}
        </button>
      </div>
    )
  }

  if (state === 'denied') {
    return (
      <div className="px-4 py-3 bg-cream-100 border border-cream-200 rounded-2xl text-sm text-stone-warm-500">
        🔕 Notifications blocked in your browser settings. To enable, go to your browser's site settings for this app and allow notifications.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleEnable}
        disabled={working}
        className="w-full flex items-center gap-3 px-4 py-3.5 bg-honey-600 hover:bg-honey-700 text-white rounded-2xl shadow-md shadow-honey-600/20 transition-colors disabled:opacity-50"
      >
        <span className="text-2xl">🔔</span>
        <div className="text-left">
          <p className="font-bold text-sm">{working ? 'Setting up…' : 'Enable push notifications'}</p>
          <p className="text-honey-100 text-xs font-normal">Get notified when your drop publishes, even with the app closed</p>
        </div>
      </button>
      {error && <p className="text-red-600 text-xs px-1">{error}</p>}
    </div>
  )
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return new Uint8Array([...rawData].map((c) => c.charCodeAt(0)))
}
