const GRAPH = 'https://graph.facebook.com/v18.0'

/** Exchange a short-lived user token for a 60-day long-lived token */
export async function getLongLivedToken(shortToken: string): Promise<string> {
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: process.env.META_APP_ID!,
    client_secret: process.env.META_APP_SECRET!,
    fb_exchange_token: shortToken,
  })
  const res = await fetch(`${GRAPH}/oauth/access_token?${params}`)
  const data = await res.json()
  if (!data.access_token) throw new Error(`Long-lived token exchange failed: ${JSON.stringify(data)}`)
  return data.access_token
}

/** Get Instagram Business/Creator account ID linked to any of the user's Facebook Pages */
export async function getInstagramAccount(
  longLivedToken: string
): Promise<{ igUserId: string; igUsername: string; pageAccessToken: string } | null> {
  // Get all Facebook Pages the user manages
  const pagesRes = await fetch(`${GRAPH}/me/accounts?access_token=${longLivedToken}`)
  const pagesData = await pagesRes.json()

  for (const page of pagesData.data ?? []) {
    const igRes = await fetch(
      `${GRAPH}/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
    )
    const igData = await igRes.json()

    if (igData.instagram_business_account?.id) {
      const igUserId: string = igData.instagram_business_account.id
      const pageAccessToken: string = page.access_token

      // Fetch username
      const usernameRes = await fetch(
        `${GRAPH}/${igUserId}?fields=username&access_token=${pageAccessToken}`
      )
      const usernameData = await usernameRes.json()

      return { igUserId, igUsername: usernameData.username ?? igUserId, pageAccessToken }
    }
  }

  return null
}

/** Post an image to Instagram. Returns the Instagram media ID. */
export async function postToInstagram(
  igUserId: string,
  accessToken: string,
  imageUrl: string,
  caption: string
): Promise<string> {
  // Step 1: create media container
  const containerRes = await fetch(`${GRAPH}/${igUserId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_url: imageUrl, caption, access_token: accessToken }),
  })
  const container = await containerRes.json()
  if (!container.id) {
    throw new Error(`Instagram media container failed: ${JSON.stringify(container)}`)
  }

  // Brief wait for container processing (Meta recommends polling, but 2s covers most cases)
  await new Promise((r) => setTimeout(r, 2000))

  // Step 2: publish
  const publishRes = await fetch(`${GRAPH}/${igUserId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: container.id, access_token: accessToken }),
  })
  const published = await publishRes.json()
  if (!published.id) {
    throw new Error(`Instagram publish failed: ${JSON.stringify(published)}`)
  }

  return published.id
}

/** Build the Meta OAuth URL for a given groupId */
export function buildMetaOAuthUrl(groupId: string, userId: string): string {
  const state = Buffer.from(JSON.stringify({ groupId, userId })).toString('base64url')
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/instagram/callback`,
    scope: 'pages_show_list,instagram_basic,instagram_content_publish',
    state,
    response_type: 'code',
  })
  return `https://www.facebook.com/v18.0/dialog/oauth?${params}`
}
