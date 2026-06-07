import { ImageResponse } from '@vercel/og'
import type { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const postId = searchParams.get('postId')

  if (!postId) {
    return new Response('Missing postId', { status: 400 })
  }

  const service = await createServiceClient()

  const { data: post } = await service
    .from('vault_posts')
    .select('*, group:groups(name)')
    .eq('id', postId)
    .single()

  if (!post) return new Response('Not found', { status: 404 })

  const orderedIds: string[] = post.photo_order ?? []
  const { data: submissions } = await service
    .from('submissions')
    .select('id, media_url, thumbnail_url, media_type')
    .eq('cycle_id', post.cycle_id)
    .in('id', orderedIds.length > 0 ? orderedIds : ['none'])

  // Generate signed URLs
  const photoUrls: string[] = []
  for (const id of orderedIds) {
    const sub = (submissions ?? []).find((s) => s.id === id)
    if (!sub) continue
    const path = sub.thumbnail_url ?? sub.media_url
    const { data } = await service.storage
      .from('submissions')
      .createSignedUrl(path, 600)
    if (data?.signedUrl) photoUrls.push(data.signedUrl)
  }

  const groupName = (post.group as { name?: string })?.name ?? 'Weekly Drop'
  const caption = post.final_caption
  const song = post.final_song

  // Grid layout logic
  const count = photoUrls.length
  const cols = count <= 1 ? 1 : count <= 2 ? 2 : 3
  const rows = Math.ceil(count / cols)
  const cellW = Math.floor(1080 / cols)
  const photoAreaH = Math.min(860, cellW * rows)
  const cellH = Math.floor(photoAreaH / rows)

  return new ImageResponse(
    (
      <div
        style={{
          width: 1080,
          height: 1080,
          display: 'flex',
          flexDirection: 'column',
          background: '#FFFBF3',
          fontFamily: 'Georgia, serif',
        }}
      >
        {/* Photo grid */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            width: 1080,
            height: photoAreaH,
            overflow: 'hidden',
          }}
        >
          {photoUrls.slice(0, cols * rows).map((url, i) => (
            <div
              key={i}
              style={{
                width: cellW,
                height: cellH,
                overflow: 'hidden',
                display: 'flex',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=""
                style={{ width: cellW, height: cellH, objectFit: 'cover' }}
              />
            </div>
          ))}
        </div>

        {/* Caption bar */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '24px 40px',
            background: '#FFFBF3',
            gap: 8,
          }}
        >
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: '#3D1A08',
              lineHeight: 1.3,
              maxHeight: 100,
              overflow: 'hidden',
            }}
          >
            {caption}
          </div>
          {song && (
            <div style={{ fontSize: 20, color: '#78716C' }}>
              🎵 {song}
            </div>
          )}
          <div style={{ fontSize: 16, color: '#A8A29E', marginTop: 4 }}>
            {groupName} · Weekly Drop
          </div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1080,
    }
  )
}
