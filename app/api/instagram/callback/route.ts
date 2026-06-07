import { createServiceClient } from '@/lib/supabase/server'
import { getLongLivedToken, getInstagramAccount } from '@/lib/instagram'
import { NextRequest } from 'next/server'

/**
 * GET /api/instagram/callback?code=...&state=...
 * Meta OAuth callback. Exchanges code for token, finds linked IG account, stores it.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const stateB64 = req.nextUrl.searchParams.get('state')
  const error = req.nextUrl.searchParams.get('error')

  if (error || !code || !stateB64) {
    return Response.redirect(
      new URL('/dashboard?error=instagram_auth_cancelled', req.url)
    )
  }

  let groupId: string
  let userId: string
  try {
    const decoded = JSON.parse(Buffer.from(stateB64, 'base64url').toString())
    groupId = decoded.groupId
    userId = decoded.userId
  } catch {
    return Response.redirect(new URL('/dashboard?error=invalid_state', req.url))
  }

  try {
    // 1. Short-lived token exchange
    const shortTokenParams = new URLSearchParams({
      client_id: process.env.META_APP_ID!,
      client_secret: process.env.META_APP_SECRET!,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/instagram/callback`,
      code,
    })
    const shortTokenRes = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?${shortTokenParams}`
    )
    const shortTokenData = await shortTokenRes.json()
    if (!shortTokenData.access_token) {
      throw new Error(`Token exchange failed: ${JSON.stringify(shortTokenData)}`)
    }

    // 2. Long-lived token (60 days)
    const longLivedToken = await getLongLivedToken(shortTokenData.access_token)

    // 3. Find Instagram Business/Creator account
    const igAccount = await getInstagramAccount(longLivedToken)
    if (!igAccount) {
      return Response.redirect(
        new URL(`/groups/${groupId}?error=no_instagram_business`, req.url)
      )
    }

    // 4. Store connection
    const service = await createServiceClient()
    await service.from('instagram_connections').upsert(
      {
        group_id: groupId,
        ig_user_id: igAccount.igUserId,
        ig_username: igAccount.igUsername,
        access_token: igAccount.pageAccessToken,
        token_expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        connected_by: userId,
      },
      { onConflict: 'group_id' }
    )

    return Response.redirect(
      new URL(`/groups/${groupId}?instagram=connected`, req.url)
    )
  } catch (err) {
    console.error('Instagram callback error:', err)
    return Response.redirect(
      new URL(`/groups/${groupId}?error=instagram_setup_failed`, req.url)
    )
  }
}
