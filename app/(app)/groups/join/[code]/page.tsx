import { redirect } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import JoinButton from './JoinButton'

export default async function JoinGroupPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=/groups/join/${code}`)
  }

  const { data: group } = await supabase
    .from('groups')
    .select('*')
    .eq('invite_code', code.toUpperCase())
    .single()

  if (!group) {
    return (
      <div className="px-4 pt-16 text-center max-w-sm mx-auto">
        <div className="text-5xl mb-4">🤔</div>
        <h1 className="font-display text-2xl font-bold text-bark-900 mb-2">Link not found</h1>
        <p className="text-stone-warm-500 text-sm">This invite link is invalid or expired.</p>
      </div>
    )
  }

  // Check if already a member
  const { data: existing } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', group.id)
    .eq('user_id', user.id)
    .single()

  if (existing) {
    redirect(`/groups/${group.id}`)
  }

  // Member count
  const { count: memberCount } = await supabase
    .from('group_members')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', group.id)

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-cream-50">
      <div className="w-full max-w-sm space-y-6">
        {/* Group preview card */}
        <div className="bg-cream-100 border border-cream-200 rounded-3xl overflow-hidden shadow-md">
          <div className="relative h-40 bg-gradient-to-br from-honey-400 to-ember-500">
            {group.cover_photo_url && (
              <Image
                src={group.cover_photo_url}
                alt={group.name}
                fill
                className="object-cover"
                sizes="390px"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-bark-900/60 to-transparent" />
            <div className="absolute bottom-4 left-4">
              <h2 className="font-display text-2xl font-bold text-white">{group.name}</h2>
            </div>
          </div>
          <div className="px-4 py-3 flex items-center gap-4 text-sm text-stone-warm-500">
            <span>👥 {memberCount} member{memberCount !== 1 ? 's' : ''}</span>
            <span>📅 Drops every {days[group.submission_day]}</span>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center space-y-1">
          <h1 className="font-display text-2xl font-bold text-bark-900">You're invited!</h1>
          <p className="text-stone-warm-500 text-sm">Join the group and start dropping memories.</p>
        </div>

        <JoinButton groupId={group.id} userId={user.id} />
      </div>
    </div>
  )
}
