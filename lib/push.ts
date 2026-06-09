import webpush from 'web-push'
import { createServiceClient } from '@/lib/supabase/server'

// Initialise VAPID credentials once
if (
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
  process.env.VAPID_PRIVATE_KEY &&
  !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY.startsWith('your_')
) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL ?? 'mailto:admin@weeklydrop.app',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

export interface PushPayload {
  title: string
  body: string
  url?: string
}

/** Send a push notification to every subscription registered for a user. */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!process.env.VAPID_PRIVATE_KEY || process.env.VAPID_PRIVATE_KEY.startsWith('your_')) return

  const service = await createServiceClient()
  const { data: subs } = await service
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth, id')
    .eq('user_id', userId)

  if (!subs || subs.length === 0) return

  const staleIds: string[] = []

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
          { TTL: 86400 }
        )
      } catch (err: unknown) {
        // 410 Gone = subscription expired — remove it
        if (err && typeof err === 'object' && 'statusCode' in err && (err as { statusCode: number }).statusCode === 410) {
          staleIds.push(sub.id)
        }
      }
    })
  )

  if (staleIds.length > 0) {
    await service.from('push_subscriptions').delete().in('id', staleIds)
  }
}

/** Send a push notification to multiple users. */
export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<void> {
  await Promise.allSettled(userIds.map((uid) => sendPushToUser(uid, payload)))
}
