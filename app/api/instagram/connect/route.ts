import { createClient } from '@/lib/supabase/server'
import { buildMetaOAuthUrl } from '@/lib/instagram'
import { NextRequest } from 'next/server'

/**
 * GET /api/instagram/connect?groupId=...
 * Initiates the Meta OAuth flow. Only group admins can connect.
 */
export async function GET(req: NextRequest) {
  const groupId = req.nextUrl.searchParams.get('groupId')
  if (!groupId) return Response.json({ error: 'Missing groupId' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.redirect(new URL('/login', req.url))

  // Verify admin membership
  const { data: member } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single()

  if (!member) {
    return Response.redirect(new URL(`/groups/${groupId}?error=not_member`, req.url))
  }

  const oauthUrl = buildMetaOAuthUrl(groupId, user.id)
  return Response.redirect(oauthUrl)
}
