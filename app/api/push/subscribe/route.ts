import { createClient, createServiceClient } from '@/lib/supabase/server'

/**
 * POST /api/push/subscribe
 * Saves a browser PushSubscription for the authenticated user.
 */
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { endpoint, keys } = body?.subscription ?? {}
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return Response.json({ error: 'Invalid subscription' }, { status: 400 })
  }

  const service = await createServiceClient()
  await service.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
    { onConflict: 'user_id, endpoint' }
  )

  return Response.json({ ok: true })
}

/**
 * DELETE /api/push/subscribe
 * Removes a push subscription.
 */
export async function DELETE(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { endpoint } = await req.json()
  if (!endpoint) return Response.json({ error: 'Missing endpoint' }, { status: 400 })

  const service = await createServiceClient()
  await service
    .from('push_subscriptions')
    .delete()
    .eq('user_id', user.id)
    .eq('endpoint', endpoint)

  return Response.json({ ok: true })
}
