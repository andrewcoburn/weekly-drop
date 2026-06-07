import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import type { GroupMember, Submission } from '@/types'
import MemberList from '@/components/groups/MemberList'
import InviteButton from '@/components/groups/InviteButton'
import InstagramConnect from '@/components/groups/InstagramConnect'
import StatusIndicator from '@/components/submissions/StatusIndicator'
import { getTimeUntilDeadline, formatShortDate, isDeadlineSoon } from '@/lib/utils'

export default async function GroupPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: group } = await supabase
    .from('groups')
    .select('*')
    .eq('id', id)
    .single()

  if (!group) notFound()

  // Verify membership
  const { data: membership } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', id)
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect('/dashboard')

  // Instagram connection (username only — token never sent to client)
  const { data: igConnection } = await supabase
    .from('instagram_connections')
    .select('ig_username, connected_at')
    .eq('group_id', id)
    .single()

  // Members with user data
  const { data: members } = await supabase
    .from('group_members')
    .select('*, user:users(*)')
    .eq('group_id', id)
    .order('joined_at', { ascending: true })

  // Current cycle
  const { data: cycles } = await supabase
    .from('weekly_cycles')
    .select('*')
    .eq('group_id', id)
    .order('week_start', { ascending: false })
    .limit(1)

  const cycle = cycles?.[0] ?? null

  // Submissions for current cycle
  let submissions: Submission[] = []
  let userSubmission: Submission | null = null
  if (cycle) {
    const { data: subs } = await supabase
      .from('submissions')
      .select('*')
      .eq('cycle_id', cycle.id)
    submissions = (subs ?? []) as Submission[]
    userSubmission = submissions.find((s) => s.user_id === user.id) ?? null
  }

  const isCaptain = cycle?.captain_id === user.id
  const isPublished = cycle?.status === 'published'
  const isMutiny = cycle?.status === 'mutiny'
  const membersList = (members ?? []) as GroupMember[]

  return (
    <div className="max-w-md mx-auto">
      {/* Hero cover */}
      <div className="relative h-56">
        <div className="absolute inset-0 bg-gradient-to-br from-honey-400 to-ember-600">
          {group.cover_photo_url && (
            <Image
              src={group.cover_photo_url}
              alt={group.name}
              fill
              className="object-cover"
              sizes="390px"
              priority
            />
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-bark-900/70 via-bark-900/20 to-transparent" />

        {/* Back button */}
        <Link
          href="/dashboard"
          className="absolute top-4 left-4 w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white text-lg"
        >
          ‹
        </Link>

        {/* Vault link */}
        <Link
          href={`/groups/${id}/vault`}
          className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-black/30 backdrop-blur-sm text-white text-xs font-medium"
        >
          Vault 📚
        </Link>

        {/* Group name */}
        <div className="absolute bottom-4 left-4 right-4">
          <h1 className="font-display text-2xl font-bold text-white">{group.name}</h1>
          <p className="text-cream-200 text-sm mt-0.5">
            {membersList.length} member{membersList.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="px-4 py-5 space-y-5">
        {/* Cycle status banner */}
        {cycle && !isPublished && (
          <div className={`rounded-2xl px-4 py-3 flex items-center justify-between ${
            isDeadlineSoon(cycle.deadline_at)
              ? 'bg-ember-500/10 border border-ember-500/20'
              : 'bg-cream-100 border border-cream-200'
          }`}>
            <div>
              <p className="text-sm font-semibold text-bark-900">
                Week of {formatShortDate(cycle.week_start)}
              </p>
              <p className={`text-xs mt-0.5 ${isDeadlineSoon(cycle.deadline_at) ? 'text-ember-600 font-medium' : 'text-stone-warm-500'}`}>
                {getTimeUntilDeadline(cycle.deadline_at)}
              </p>
            </div>
            <span className="text-sm font-medium text-stone-warm-500">
              {submissions.length}/{membersList.length} submitted
            </span>
          </div>
        )}

        {isPublished && (
          <div className="bg-honey-400/20 border border-honey-400 rounded-2xl px-4 py-3 text-center">
            <p className="text-honey-700 font-semibold text-sm">✨ This week's drop is published!</p>
            <Link href={`/groups/${id}/vault`} className="text-honey-600 text-xs underline underline-offset-2 mt-1 block">
              View it in the Vault
            </Link>
          </div>
        )}

        {/* Captain special card */}
        {isCaptain && !isPublished && cycle?.status !== 'mutiny' && (
          <Link href={`/groups/${id}/captain`}>
            <div className="bg-gradient-to-br from-honey-500 to-ember-500 rounded-3xl p-4 shadow-lg shadow-honey-500/30">
              <div className="flex items-center gap-3">
                <span className="text-3xl">👑</span>
                <div>
                  <p className="text-white font-bold">You're the Captain this week!</p>
                  <p className="text-honey-100 text-sm mt-0.5">
                    {cycle.status === 'captain_set'
                      ? 'Caption submitted ✓ — edit if needed'
                      : 'Write the caption & pick a song'}
                  </p>
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* Mutiny mode card */}
        {isMutiny && (
          <Link href={`/groups/${id}/vote`}>
            <div className="bg-gradient-to-br from-bark-800 to-bark-900 rounded-3xl p-4 shadow-lg">
              <div className="flex items-center gap-3">
                <span className="text-3xl">⚡</span>
                <div>
                  <p className="text-white font-bold">Mutiny Mode!</p>
                  <p className="text-cream-200 text-sm mt-0.5">Captain missed the drop. Vote for a caption!</p>
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* User submission status */}
        {cycle && !isPublished && (
          <div className="flex items-center justify-between">
            <StatusIndicator submitted={!!userSubmission} isOwn />
            {!userSubmission && (
              <Link
                href={`/groups/${id}/submit`}
                className="bg-honey-600 hover:bg-honey-700 text-white font-semibold px-4 py-2 rounded-2xl text-sm shadow-md shadow-honey-600/20 transition-colors"
              >
                Drop it 📸
              </Link>
            )}
          </div>
        )}

        {/* Member submission grid */}
        <div>
          <h2 className="text-sm font-semibold text-bark-800 mb-3">This week's crew</h2>
          <MemberList
            members={membersList}
            submissions={submissions}
            cyclePublished={isPublished}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <InviteButton inviteCode={group.invite_code} groupName={group.name} />
          <LeaveGroupButton groupId={id} userId={user.id} isAdmin={membership.role === 'admin'} />
        </div>

        {/* Instagram */}
        <div>
          <h2 className="text-sm font-semibold text-bark-800 mb-3">Instagram</h2>
          <InstagramConnect
            groupId={id}
            isAdmin={membership.role === 'admin'}
            connection={igConnection ?? null}
          />
        </div>
      </div>
    </div>
  )
}

function LeaveGroupButton({
  groupId,
  userId,
  isAdmin,
}: {
  groupId: string
  userId: string
  isAdmin: boolean
}) {
  return (
    <form action={async () => {
      'use server'
      const { createClient } = await import('@/lib/supabase/server')
      const { redirect } = await import('next/navigation')
      const supabase = await createClient()
      await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId)
      redirect('/dashboard')
    }}>
      <button
        type="submit"
        className="px-3 py-2 bg-cream-100 border border-cream-200 text-stone-warm-500 text-sm rounded-2xl hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors"
      >
        Leave
      </button>
    </form>
  )
}
