'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'

export default function ResetPasswordForm() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError("Passwords don't match."); return }

    setSaving(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setSaving(false)
    } else {
      setDone(true)
      setTimeout(() => router.push('/dashboard'), 1500)
    }
  }

  if (done) {
    return (
      <div className="text-center space-y-3 py-4">
        <div className="text-5xl">✅</div>
        <h2 className="font-display text-xl font-bold text-bark-900">Password updated!</h2>
        <p className="text-stone-warm-500 text-sm">Taking you to the app…</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center mb-2">
        <div className="text-4xl mb-3">🔑</div>
        <h2 className="font-display text-xl font-bold text-bark-900">Set a new password</h2>
        <p className="text-stone-warm-500 text-sm mt-1">Choose something you'll remember.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-bark-800 mb-1.5">New password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Min. 8 characters"
          required
          minLength={8}
          autoFocus
          autoComplete="new-password"
          className="w-full px-4 py-3 bg-white border border-cream-200 rounded-2xl text-bark-900 placeholder-stone-warm-400 focus:border-honey-500 focus:ring-2 focus:ring-honey-500/20 transition-colors"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-bark-800 mb-1.5">Confirm password</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Same password again"
          required
          autoComplete="new-password"
          className={`w-full px-4 py-3 bg-white border rounded-2xl text-bark-900 placeholder-stone-warm-400 focus:ring-2 transition-colors ${
            confirm && confirm !== password
              ? 'border-red-300 focus:border-red-400 focus:ring-red-400/20'
              : 'border-cream-200 focus:border-honey-500 focus:ring-honey-500/20'
          }`}
        />
        {confirm && confirm !== password && (
          <p className="text-red-500 text-xs mt-1 ml-1">Passwords don't match</p>
        )}
      </div>

      {error && (
        <p className="text-red-600 text-sm bg-red-50 px-4 py-2.5 rounded-2xl border border-red-100">
          {error}
        </p>
      )}

      <Button type="submit" fullWidth size="lg" loading={saving}>
        Save password & sign in
      </Button>
    </form>
  )
}
