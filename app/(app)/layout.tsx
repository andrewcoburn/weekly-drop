import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Unread notification count
  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('read', false)

  const unreadCount = count ?? 0

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col">
      <main className="flex-1 pb-nav">
        {children}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-cream-50/95 backdrop-blur-sm border-t border-cream-200 z-40"
           style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex items-center justify-around max-w-md mx-auto h-16">
          <NavItem href="/dashboard" icon="🏠" label="Home" />
          <NavItem href="/groups/create" icon="＋" label="New" highlight />
          <NavItem href="/notifications" icon="🔔" label="Alerts" badge={unreadCount} />
        </div>
      </nav>
    </div>
  )
}

function NavItem({
  href,
  icon,
  label,
  highlight,
  badge,
}: {
  href: string
  icon: string
  label: string
  highlight?: boolean
  badge?: number
}) {
  if (highlight) {
    return (
      <Link href={href} className="flex flex-col items-center gap-0.5">
        <div className="w-12 h-12 rounded-2xl bg-honey-600 flex items-center justify-center shadow-md shadow-honey-600/30 text-white text-2xl font-light">
          {icon}
        </div>
      </Link>
    )
  }

  return (
    <Link href={href} className="flex flex-col items-center gap-0.5 px-4 py-1 relative">
      <span className="text-2xl relative">
        {icon}
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-ember-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center px-1">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </span>
      <span className="text-[10px] text-stone-warm-500 font-medium">{label}</span>
    </Link>
  )
}
