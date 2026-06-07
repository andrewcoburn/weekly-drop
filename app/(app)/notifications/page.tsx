import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Notification } from '@/types'
import { formatDate } from '@/lib/utils'

const icons: Record<string, string> = {
  captain_selected: '👑',
  reminder: '⏰',
  post_published: '✨',
  mutiny: '⚡',
}

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  // Mark all as read
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', user.id)
    .eq('read', false)

  const items = (notifications ?? []) as Notification[]

  return (
    <div className="px-4 pt-6 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard" className="text-xl text-stone-warm-500">‹</Link>
        <h1 className="font-display text-2xl font-bold text-bark-900">Notifications</h1>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🔔</div>
          <p className="text-stone-warm-500">Nothing here yet. Check back after your first drop!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-3 px-4 py-3 rounded-2xl border transition-colors ${
                !n.read
                  ? 'bg-honey-400/10 border-honey-300'
                  : 'bg-cream-100 border-cream-200'
              }`}
            >
              <span className="text-xl mt-0.5 flex-shrink-0">{icons[n.type] ?? '🔔'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-bark-900 leading-snug">{n.message}</p>
                <p className="text-xs text-stone-warm-400 mt-1">{formatDate(n.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
