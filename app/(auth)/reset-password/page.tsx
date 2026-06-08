'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError("Passwords don’t match.")
      return
    }
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center mb-2">
        <div className="text-4xl mb-3">🔑</div>
        <h2 className="font-display text-xl font-bold text-bark-900">Set your password</h2>
        <p className="text-stone-warm-500 text-sm mt-1">Choose a password you'll use to sign in.</p>
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
          className="w-full px-4 py-3 bg-white border border-cream-200 rounded-2xl text-bark-900 placeholder-stone-warm-400 focus:border-honey-500 focus:ring-2 focus:ring-honey-500/20 transition-colors"
        />
      </div>

      {error && (
        <p className="text-red-600 text-sm bg-red-50 px-4 py-2.5 rounded-2xl border border-red-100">
          {error}
        </p>
      )}

      <Button type="submit" fullWidth size="lg" loading={loading}>
        Save password & sign in
      </Button>
    </form>
  )
}
