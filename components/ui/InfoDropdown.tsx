'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface InfoDropdownProps {
  label: string
  children: React.ReactNode
  className?: string
}

export default function InfoDropdown({ label, children, className }: InfoDropdownProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className={cn('rounded-2xl border border-cream-200 bg-cream-100 overflow-hidden', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-cream-200 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-bark-800">
          <span className="w-5 h-5 rounded-full bg-honey-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
            i
          </span>
          {label}
        </span>
        <span className={`text-stone-warm-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 text-sm text-bark-800 space-y-3 border-t border-cream-200 pt-3 animate-slide-up">
          {children}
        </div>
      )}
    </div>
  )
}
