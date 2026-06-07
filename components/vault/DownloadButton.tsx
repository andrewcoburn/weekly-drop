'use client'

import { useState } from 'react'

interface DownloadButtonProps {
  postId: string
  weekLabel: string
}

export default function DownloadButton({ postId, weekLabel }: DownloadButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleDownload() {
    setLoading(true)
    try {
      const res = await fetch(`/api/og?postId=${postId}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `weekly-drop-${weekLabel}.png`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Download failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-cream-100 border border-cream-200 text-bark-800 text-xs font-medium rounded-xl hover:bg-cream-200 transition-colors disabled:opacity-50"
    >
      {loading ? (
        <>
          <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Preparing…
        </>
      ) : (
        <>⬇ Save for Instagram</>
      )}
    </button>
  )
}
