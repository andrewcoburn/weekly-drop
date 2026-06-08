'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="text-center space-y-4">
        <div className="text-5xl mb-4">📬</div>
        <h2 className="font-display text-2xl font-bold text-bark-900">Check your inbox</h2>
        <p className="text-stone-warm-500 text-sm leading-relaxed">
          We sent a password reset link to{' '}
          <strong className="text-bark-800">{email}</strong>.<br />
          Click it to set a new password.
        </p>
        <Link href="/login" className="text-sm text-honey-600 underline underline-offset-2 block">
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center mb-2">
        <h2 className="font-display text-xl font-bold text-bark-900">Set a password</h2>
        <p className="text-stone-warm-500 text-sm mt-1">
          Enter your email and we'll send a link to set a new password.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-bark-800 mb-1.5">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          autoComplete="email"
          className="w-full px-4 py-3 bg-white border border-cream-200 rounded-2xl text-bark-900 placeholder-stone-warm-400 focus:border-honey-500 focus:ring-2 focus:ring-honey-500/20 transition-colors"
        />
      </div>

      {error && (
        <p className="text-red-600 text-sm bg-red-50 px-4 py-2.5 rounded-2xl border border-red-100">
          {error}
        </p>
      )}

      <Button type="submit" fullWidth size="lg" loading={loading}>
        Send reset link
      </Button>

      <Link href="/login" className="block text-center text-sm text-stone-warm-500 underline underline-offset-2">
        ← Back to sign in
      </Link>
    </form>
  )
}
