'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import InfoDropdown from '@/components/ui/InfoDropdown'
import Button from '@/components/ui/Button'

interface InstagramConnectProps {
  groupId: string
  isAdmin: boolean
  connection: { ig_username: string; connected_at: string } | null
}

export default function InstagramConnect({ groupId, isAdmin, connection }: InstagramConnectProps) {
  const router = useRouter()
  const [disconnecting, setDisconnecting] = useState(false)

  async function handleDisconnect() {
    if (!confirm(`Disconnect Instagram? Future drops won't auto-post.`)) return
    setDisconnecting(true)
    await fetch('/api/instagram/disconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId }),
    })
    router.refresh()
    setDisconnecting(false)
  }

  return (
    <div className="space-y-3">
      {/* Connection status */}
      {connection ? (
        <div className="bg-cream-100 border border-cream-200 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">📸</span>
            <div>
              <p className="text-sm font-semibold text-bark-900">@{connection.ig_username}</p>
              <p className="text-xs text-stone-warm-500">Auto-posts to this account</p>
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="text-xs text-stone-warm-500 hover:text-red-600 transition-colors font-medium"
            >
              {disconnecting ? '...' : 'Disconnect'}
            </button>
          )}
        </div>
      ) : (
        <>
          {isAdmin ? (
            <a href={`/api/instagram/connect?groupId=${groupId}`}>
              <Button variant="secondary" fullWidth>
                <span className="flex items-center justify-center gap-2">
                  <InstagramIcon />
                  Connect Instagram
                </span>
              </Button>
            </a>
          ) : (
            <div className="bg-cream-100 border border-cream-200 rounded-2xl px-4 py-3 text-sm text-stone-warm-500 text-center">
              No Instagram connected — ask the group admin to set it up.
            </div>
          )}
        </>
      )}

      {/* Info dropdown */}
      <InfoDropdown label="How Instagram auto-posting works">
        <div className="space-y-3">
          <p className="text-stone-warm-600 leading-relaxed">
            When connected, every weekly drop auto-posts to the linked Instagram account the moment the deadline hits — no manual work needed.
          </p>

          <div>
            <p className="font-semibold text-bark-900 mb-1.5">What you need</p>
            <ul className="space-y-1.5 text-stone-warm-600">
              <li className="flex gap-2">
                <span className="text-honey-600 font-bold flex-shrink-0">1.</span>
                <span>An Instagram <strong className="text-bark-800">Business or Creator account</strong> (free upgrade — Settings → Account → Switch to Professional)</span>
              </li>
              <li className="flex gap-2">
                <span className="text-honey-600 font-bold flex-shrink-0">2.</span>
                <span>That Instagram account must be <strong className="text-bark-800">linked to a Facebook Page</strong> (required by Meta)</span>
              </li>
              <li className="flex gap-2">
                <span className="text-honey-600 font-bold flex-shrink-0">3.</span>
                <span>The app needs a <strong className="text-bark-800">Meta Developer App</strong> — see setup guide below</span>
              </li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-bark-900 mb-1.5">Developer app setup (one-time)</p>
            <ol className="space-y-1.5 text-stone-warm-600 list-decimal list-inside">
              <li>Go to <strong className="text-bark-800">developers.facebook.com</strong> → Create App → Consumer type</li>
              <li>Add the <strong className="text-bark-800">Instagram Graph API</strong> product</li>
              <li>Under App Settings → Basic, copy your App ID and App Secret into <code className="bg-cream-200 px-1 rounded text-xs">.env.local</code></li>
              <li>Add your Vercel URL as an OAuth redirect URI in the Facebook Login settings</li>
              <li>Submit for App Review requesting <code className="bg-cream-200 px-1 rounded text-xs">instagram_content_publish</code> permission (takes ~1–2 weeks)</li>
            </ol>
          </div>

          <div className="bg-honey-400/10 border border-honey-300 rounded-xl px-3 py-2">
            <p className="text-honey-700 text-xs font-medium">
              💡 Only one person per group needs to do this. Other members don't need to connect anything. The manual download always stays available as a fallback.
            </p>
          </div>
        </div>
      </InfoDropdown>
    </div>
  )
}

function InstagramIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  )
}
