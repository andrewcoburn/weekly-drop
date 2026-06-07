import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { VaultPost, SubmissionWithUrl } from '@/types'
import VaultEntry from '@/components/vault/VaultEntry'

export default async function VaultPage({
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
    .select('name')
    .eq('id', id)
    .single()

  if (!group) notFound()

  // Verify membership
  const { data: membership } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', id)
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect('/dashboard')

  // Fetch published vault posts
  const { data: posts } = await supabase
    .from('vault_posts')
    .select('*')
    .eq('group_id', id)
    .order('published_at', { ascending: false })

  // Enrich each post with signed URLs
  const enrichedPosts: VaultPost[] = await Promise.all(
    (posts ?? []).map(async (post) => {
      const orderedIds: string[] = post.photo_order ?? []

      const { data: subs } = await supabase
        .from('submissions')
        .select('*')
        .eq('cycle_id', post.cycle_id)
        .in('id', orderedIds.length > 0 ? orderedIds : ['none'])

      const submissionsWithUrls: SubmissionWithUrl[] = await Promise.all(
        (subs ?? []).map(async (sub) => {
          const thumbPath = sub.thumbnail_url ?? sub.media_url
          const { data: thumbData } = await supabase.storage
            .from('submissions')
            .createSignedUrl(thumbPath, 3600)
          const { data: mediaData } = await supabase.storage
            .from('submissions')
            .createSignedUrl(sub.media_url, 3600)
          return {
            ...sub,
            media_type: sub.media_type as 'photo' | 'video',
            signed_url: mediaData?.signedUrl ?? '',
            thumbnail_signed_url: sub.thumbnail_url ? thumbData?.signedUrl : undefined,
          }
        })
      )

      // Sort by photo_order
      const ordered = orderedIds
        .map((sid) => submissionsWithUrls.find((s) => s.id === sid))
        .filter(Boolean) as SubmissionWithUrl[]

      return {
        ...post,
        photo_order: orderedIds,
        submissions: ordered,
      }
    })
  )

  return (
    <div className="px-4 pt-6 pb-8 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/groups/${id}`} className="text-xl text-stone-warm-500">‹</Link>
        <div>
          <h1 className="font-display text-2xl font-bold text-bark-900">Memory Vault</h1>
          <p className="text-stone-warm-500 text-sm">{group.name}</p>
        </div>
      </div>

      {enrichedPosts.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📚</div>
          <h2 className="font-display text-xl font-bold text-bark-900 mb-2">Empty for now</h2>
          <p className="text-stone-warm-500 text-sm leading-relaxed">
            Your first published drop will live here.<br />Keep making memories!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {enrichedPosts.map((post) => (
            <VaultEntry key={post.id} post={post} currentUserId={user.id} />
          ))}
        </div>
      )}
    </div>
  )
}
