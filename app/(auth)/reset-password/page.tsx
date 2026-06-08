import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ResetPasswordForm from './ResetPasswordForm'

interface Props {
  searchParams: Promise<{ error?: string }>
}

export default async function ResetPasswordPage({ searchParams }: Props) {
  const { error: errorParam } = await searchParams

  // Callback already exchanged the token and set the session cookie.
  // We just need to verify a session exists.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (errorParam === 'expired' || !user) {
    return <LinkExpired />
  }

  return <ResetPasswordForm />
}

function LinkExpired() {
  return (
    <div className="text-center space-y-4">
      <div className="text-5xl">🔗</div>
      <h2 className="font-display text-xl font-bold text-bark-900">
        Link expired or already used
      </h2>
      <p className="text-stone-warm-500 text-sm leading-relaxed">
        Reset links expire after 1 hour and can only be used once.
      </p>
      <Link
        href="/forgot-password"
        className="block w-full bg-honey-600 hover:bg-honey-700 text-white font-semibold px-5 py-3 rounded-2xl text-sm text-center transition-colors"
      >
        Request a new reset link
      </Link>
      <Link
        href="/login"
        className="block text-sm text-stone-warm-400 underline underline-offset-2"
      >
        Back to sign in
      </Link>
    </div>
  )
}
