'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import OtpInput from '@/components/ui/OtpInput'
import ResendButton from '@/components/ui/ResendButton'

const NOT_CONFIGURED =
  'App not connected to a database yet. Add your Supabase credentials in Vercel → Project Settings → Environment Variables, then redeploy.'

function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  if (msg.includes('Invalid value') || msg.includes('fetch') || msg.includes('SUPABASE'))
    return NOT_CONFIGURED
  return msg
}

type Step = 'form' | 'verify'

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('form')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [otp, setOtp] = useState('')

  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) { setError('Please enter your name.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError("Passwords don't match."); return }
    if (!isSupabaseConfigured()) { setError(NOT_CONFIGURED); return }

    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name: name.trim() } },
      })
      if (error) throw error
      if (data.session) {
        router.push('/dashboard')
        router.refresh()
      } else {
        setStep('verify')
      }
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify(code: string) {
    const token = code || otp
    if (token.length < 6) return
    if (!isSupabaseConfigured()) { setError(NOT_CONFIGURED); return }
    setVerifying(true)
    setError(null)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' })
      if (error) throw error
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(
        msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('invalid')
          ? 'Invalid or expired code. Try resending.'
          : friendlyError(err)
      )
      setVerifying(false)
    }
  }

  async function resendCode() {
    if (!isSupabaseConfigured()) return
    try {
      const supabase = createClient()
      await supabase.auth.resend({ type: 'signup', email })
    } catch { /* silent */ }
  }

  function handleOtpChange(val: string) {
    setOtp(val)
    if (val.length === 6) handleVerify(val)
  }

  if (step === 'verify') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="text-4xl mb-3">📬</div>
          <h2 className="font-display text-2xl font-bold text-bark-900">Check your email</h2>
          <p className="text-stone-warm-500 text-sm mt-1.5 leading-relaxed">
            We sent a 6-digit code to<br />
            <strong className="text-bark-800">{email}</strong>
          </p>
        </div>

        <OtpInput value={otp} onChange={handleOtpChange} disabled={verifying} />

        <div className="bg-cream-100 border border-cream-200 rounded-2xl px-4 py-3 text-xs text-stone-warm-500 space-y-1">
          <p>📬 <strong className="text-bark-800">No email?</strong> Check your spam / junk folder first.</p>
          <p>If it's not there, hit "Resend code" below.</p>
        </div>

        {error && (
          <p className="text-red-600 text-sm bg-red-50 px-4 py-2.5 rounded-2xl border border-red-100 text-center">{error}</p>
        )}

        <Button fullWidth size="lg" onClick={() => handleVerify(otp)} loading={verifying} disabled={otp.length < 6}>
          Confirm account
        </Button>

        <ResendButton onResend={resendCode} />

        <button type="button" onClick={() => { setStep('form'); setOtp(''); setError(null) }}
          className="w-full text-sm text-stone-warm-400 underline underline-offset-2">
          ← Change email or password
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSignup} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-bark-800 mb-1.5">Your name</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Alex" required autoComplete="name"
          className="w-full px-4 py-3 bg-white border border-cream-200 rounded-2xl text-bark-900 placeholder-stone-warm-400 focus:border-honey-500 focus:ring-2 focus:ring-honey-500/20 transition-colors" />
      </div>

      <div>
        <label className="block text-sm font-medium text-bark-800 mb-1.5">Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com" required autoComplete="email"
          className="w-full px-4 py-3 bg-white border border-cream-200 rounded-2xl text-bark-900 placeholder-stone-warm-400 focus:border-honey-500 focus:ring-2 focus:ring-honey-500/20 transition-colors" />
      </div>

      <div>
        <label className="block text-sm font-medium text-bark-800 mb-1.5">Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="Min. 8 characters" required minLength={8} autoComplete="new-password"
          className="w-full px-4 py-3 bg-white border border-cream-200 rounded-2xl text-bark-900 placeholder-stone-warm-400 focus:border-honey-500 focus:ring-2 focus:ring-honey-500/20 transition-colors" />
      </div>

      <div>
        <label className="block text-sm font-medium text-bark-800 mb-1.5">Confirm password</label>
        <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
          placeholder="Same password again" required autoComplete="new-password"
          className={`w-full px-4 py-3 bg-white border rounded-2xl text-bark-900 placeholder-stone-warm-400 focus:ring-2 transition-colors ${
            confirm && confirm !== password
              ? 'border-red-300 focus:border-red-400 focus:ring-red-400/20'
              : 'border-cream-200 focus:border-honey-500 focus:ring-honey-500/20'
          }`} />
        {confirm && confirm !== password && (
          <p className="text-red-500 text-xs mt-1 ml-1">Passwords don't match</p>
        )}
      </div>

      {error && (
        <p className="text-red-600 text-sm bg-red-50 px-4 py-2.5 rounded-2xl border border-red-100">{error}</p>
      )}

      <Button type="submit" fullWidth size="lg" loading={loading}>
        Create account 🎉
      </Button>

      <p className="text-center text-sm text-stone-warm-500">
        Already have an account?{' '}
        <Link href="/login" className="text-honey-600 font-medium underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </form>
  )
}
