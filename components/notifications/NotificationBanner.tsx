import Link from 'next/link'
import type { Notification } from '@/types'

interface NotificationBannerProps {
  notifications: Notification[]
}

export default function NotificationBanner({ notifications }: NotificationBannerProps) {
  const unread = notifications.filter((n) => !n.read)
  if (unread.length === 0) return null

  const latest = unread[0]

  const icons: Record<string, string> = {
    captain_selected: '👑',
    reminder: '⏰',
    post_published: '✨',
    mutiny: '⚡',
  }

  return (
    <Link href="/notifications">
      <div className="bg-honey-600 text-white px-4 py-3 rounded-2xl flex items-center gap-3 shadow-md shadow-honey-600/30 active:scale-[0.98] transition-transform">
        <span className="text-xl flex-shrink-0">{icons[latest.type] ?? '🔔'}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-tight truncate">{latest.message}</p>
          {unread.length > 1 && (
            <p className="text-xs text-honey-200 mt-0.5">+{unread.length - 1} more</p>
          )}
        </div>
        <span className="text-honey-200 text-lg">›</span>
      </div>
    </Link>
  )
}
