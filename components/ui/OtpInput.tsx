'use client'

import { useRef, KeyboardEvent, ClipboardEvent } from 'react'

interface OtpInputProps {
  value: string
  onChange: (val: string) => void
  length?: number
  disabled?: boolean
}

export default function OtpInput({ value, onChange, length = 6, disabled }: OtpInputProps) {
  const inputs = useRef<(HTMLInputElement | null)[]>([])
  const chars = value.split('').concat(Array(length).fill('')).slice(0, length)

  function handleChange(idx: number, raw: string) {
    const digit = raw.replace(/\D/g, '').slice(-1)
    const next = [...chars]
    next[idx] = digit
    onChange(next.join('').trimEnd())
    if (digit && idx < length - 1) inputs.current[idx + 1]?.focus()
  }

  function handleKey(idx: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !chars[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus()
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    onChange(text)
    inputs.current[Math.min(text.length, length - 1)]?.focus()
  }

  return (
    <div className="flex gap-2 justify-center">
      {chars.map((char, idx) => (
        <input
          key={idx}
          ref={(el) => { inputs.current[idx] = el }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={char}
          disabled={disabled}
          onChange={(e) => handleChange(idx, e.target.value)}
          onKeyDown={(e) => handleKey(idx, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className="w-11 h-14 text-center text-2xl font-bold bg-white border-2 border-cream-200 rounded-2xl text-bark-900 focus:border-honey-500 focus:ring-2 focus:ring-honey-500/20 transition-colors disabled:opacity-50 caret-transparent"
        />
      ))}
    </div>
  )
}
