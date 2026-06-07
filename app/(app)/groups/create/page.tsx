'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const TIMEZONES = [
  { label: 'New York (ET)', value: 'America/New_York' },
  { label: 'Chicago (CT)', value: 'America/Chicago' },
  { label: 'Denver (MT)', value: 'America/Denver' },
  { label: 'Los Angeles (PT)', value: 'America/Los_Angeles' },
  { label: 'London (GMT/BST)', value: 'Europe/London' },
  { label: 'Paris / Berlin (CET)', value: 'Europe/Paris' },
  { label: 'Dubai (GST)', value: 'Asia/Dubai' },
  { label: 'Mumbai (IST)', value: 'Asia/Kolkata' },
  { label: 'Singapore (SGT)', value: 'Asia/Singapore' },
  { label: 'Sydney (AEDT)', value: 'Australia/Sydney' },
  { label: 'UTC', value: 'UTC' },
]

export default function CreateGroupPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [day, setDay] = useState(0) // Sunday default
  const [timezone, setTimezone] = useState(() =>
    Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC'
  )
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setCoverFile(f)
    setCoverPreview(URL.createObjectURL(f))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Upload cover photo
      let coverUrl: string | null = null
      if (coverFile) {
        const ext = coverFile.name.split('.').pop()
        const path = `${user.id}/${Date.now()}.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from('group-covers')
          .upload(path, coverFile)
        if (uploadErr) throw uploadErr

        const { data: { publicUrl } } = supabase.storage
          .from('group-covers')
          .getPublicUrl(path)
        coverUrl = publicUrl
      }

      // Create group
      const { data: group, error: groupErr } = await supabase
        .from('groups')
        .insert({
          name: name.trim(),
          submission_day: day,
          timezone,
          cover_photo_url: coverUrl,
          created_by: user.id,
        })
        .select()
        .single()

      if (groupErr) throw groupErr

      // Add creator as admin member
      await supabase.from('group_members').insert({
        group_id: group.id,
        user_id: user.id,
        role: 'admin',
      })

      // Create first cycle via API
      await fetch('/api/captain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: group.id }),
      })

      router.push(`/groups/${group.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create group')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="px-4 pt-6 pb-8 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard" className="text-xl text-stone-warm-500">‹</Link>
        <h1 className="font-display text-2xl font-bold text-bark-900">Create a group</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Cover photo */}
        <div>
          <label className="block text-sm font-medium text-bark-800 mb-2">Cover photo</label>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-40 rounded-3xl border-2 border-dashed border-honey-400 bg-cream-100 hover:bg-cream-200 transition-colors overflow-hidden relative flex flex-col items-center justify-center gap-2"
          >
            {coverPreview ? (
              <Image src={coverPreview} alt="Cover" fill className="object-cover" sizes="390px" />
            ) : (
              <>
                <span className="text-3xl">🌄</span>
                <span className="text-sm text-stone-warm-500">Tap to add a cover photo</span>
              </>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleCoverChange}
          />
        </div>

        {/* Group name */}
        <div>
          <label className="block text-sm font-medium text-bark-800 mb-1.5">Group name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="The Weekend Crew"
            required
            maxLength={60}
            className="w-full px-4 py-3 bg-white border border-cream-200 rounded-2xl text-bark-900 placeholder-stone-warm-400 focus:border-honey-500 focus:ring-2 focus:ring-honey-500/20 transition-colors"
          />
        </div>

        {/* Submission day */}
        <div>
          <label className="block text-sm font-medium text-bark-800 mb-2">Drops every…</label>
          <div className="grid grid-cols-4 gap-2">
            {DAYS.map((d, i) => (
              <button
                key={d}
                type="button"
                onClick={() => setDay(i)}
                className={`py-2.5 rounded-2xl text-sm font-medium transition-colors ${
                  day === i
                    ? 'bg-honey-600 text-white shadow-md shadow-honey-600/20'
                    : 'bg-cream-100 border border-cream-200 text-bark-800 hover:bg-cream-200'
                }`}
              >
                {d.slice(0, 3)}
              </button>
            ))}
          </div>
          <p className="text-xs text-stone-warm-400 mt-2">
            Deadline: {DAYS[day]} at 11:59 PM in your group's timezone
          </p>
        </div>

        {/* Timezone */}
        <div>
          <label className="block text-sm font-medium text-bark-800 mb-1.5">Group timezone</label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full px-4 py-3 bg-white border border-cream-200 rounded-2xl text-bark-900 focus:border-honey-500 focus:ring-2 focus:ring-honey-500/20 transition-colors appearance-none"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>{tz.label}</option>
            ))}
            <option value={timezone}>{timezone} (detected)</option>
          </select>
        </div>

        {error && (
          <p className="text-red-600 text-sm bg-red-50 px-4 py-2.5 rounded-2xl border border-red-100">
            {error}
          </p>
        )}

        <Button type="submit" fullWidth size="lg" loading={loading}>
          Create group 🎉
        </Button>
      </form>
    </div>
  )
}
