'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import OtpInput from '@/components/ui/OtpInput'
import ResendButton from '@/components/ui/ResendButton'

type Mode = 'password' | 'otp-send' | 'otp-verify'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('password')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')

  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Password sign-in ──
  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(
        error.message.includes('Invalid login credentials')
          ? 'Wrong email or password. Try again, or use "Forgot password" below.'
          : error.message
      )
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  // ── Send OTP code ──
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({ email })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setMode('otp-verify')
      setLoading(false)
    }
  }

  // ── Verify OTP code ──
  async function handleVerify(code: string) {
    const token = code ?? otp
    if (token.length < 6) return
    setVerifying(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })

    if (error) {
      setError('Invalid or expired code. Try resending.')
      setVerifying(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  async function resendOtp() {
    const supabase = createClient()
    await supabase.auth.signInWithOtp({ email })
  }

  function handleOtpChange(val: string) {
    setOtp(val)
    if (val.length === 6) handleVerify(val)
  }

  // ── OTP verify screen ──
  if (mode === 'otp-verify') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="text-4xl mb-3">🔢</div>
          <h2 className="font-display text-2xl font-bold text-bark-900">Enter your code</h2>
          <p className="text-stone-warm-500 text-sm mt-1.5 leading-relaxed">
            We sent a 6-digit code to<br />
            <strong className="text-bark-800">{email}</strong>
          </p>
        </div>

        <OtpInput value={otp} onChange={handleOtpChange} disabled={verifying} />

        {error && (
          <p className="text-red-600 text-sm bg-red-50 px-4 py-2.5 rounded-2xl border border-red-100 text-center">
            {error}
          </p>
        )}

        <Button
          fullWidth
          size="lg"
          onClick={() => handleVerify(otp)}
          loading={verifying}
          disabled={otp.length < 6}
        >
          Sign in
        </Button>

        <ResendButton onResend={resendOtp} />

        <button
          type="button"
          onClick={() => { setMode('password'); setOtp(''); setError(null) }}
          className="w-full text-sm text-stone-warm-400 underline underline-offset-2"
        >
          ← Back to sign in
        </button>
      </div>
    )
  }

  // ── Send code screen ──
  if (mode === 'otp-send') {
    return (
      <form onSubmit={handleSendOtp} className="space-y-4">
        <div className="text-center mb-2">
          <p className="text-sm text-stone-warm-500">Enter your email and we'll send a 6-digit code.</p>
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
          Send code
        </Button>

        <button
          type="button"
          onClick={() => { setMode('password'); setError(null) }}
          className="w-full text-sm text-stone-warm-400 underline underline-offset-2 text-center"
        >
          ← Use password instead
        </button>
      </form>
    )
  }

  // ── Password sign-in screen (default) ──
  return (
    <form onSubmit={handlePasswordLogin} className="space-y-4">
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

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-sm font-medium text-bark-800">Password</label>
          <Link href="/forgot-password" className="text-xs text-honey-600 underline underline-offset-2">
            Forgot password?
          </Link>
        </div>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          autoComplete="current-password"
          className="w-full px-4 py-3 bg-white border border-cream-200 rounded-2xl text-bark-900 placeholder-stone-warm-400 focus:border-honey-500 focus:ring-2 focus:ring-honey-500/20 transition-colors"
        />
      </div>

      {error && (
        <p className="text-red-600 text-sm bg-red-50 px-4 py-2.5 rounded-2xl border border-red-100">
          {error}
        </p>
      )}

      <Button type="submit" fullWidth size="lg" loading={loading}>
        Sign in
      </Button>

      <div className="flex flex-col items-center gap-2 pt-1">
        <p className="text-sm text-stone-warm-500">
          New here?{' '}
          <Link href="/signup" className="text-honey-600 font-medium underline underline-offset-2">
            Create an account
          </Link>
        </p>
        <button
          type="button"
          onClick={() => { setMode('otp-send'); setError(null) }}
          className="text-xs text-stone-warm-400 underline underline-offset-2"
        >
          Sign in with a code instead
        </button>
      </div>
    </form>
  )
}
