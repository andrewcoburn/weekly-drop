'use client'

import { useState, useEffect } from 'react'

interface ResendButtonProps {
  onResend: () => Promise<void>
  cooldownSeconds?: number
}

export default function ResendButton({ onResend, cooldownSeconds = 30 }: ResendButtonProps) {
  const [secondsLeft, setSecondsLeft] = useState(cooldownSeconds)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (secondsLeft <= 0) return
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [secondsLeft])

  async function handleResend() {
    setSending(true)
    await onResend()
    setSecondsLeft(cooldownSeconds)
    setSending(false)
  }

  if (secondsLeft > 0) {
    return (
      <p className="text-center text-sm text-stone-warm-400">
        Resend code in <span className="font-medium text-stone-warm-500">{secondsLeft}s</span>
      </p>
    )
  }

  return (
    <button
      type="button"
      onClick={handleResend}
      disabled={sending}
      className="w-full text-sm text-honey-600 font-medium underline underline-offset-2 disabled:opacity-50"
    >
      {sending ? 'Sending…' : 'Resend code'}
    </button>
  )
}
