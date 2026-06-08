'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getInitials, formatDate } from '@/lib/utils'
import Button from '@/components/ui/Button'

interface Props {
  userId: string
  email: string
  initialName: string
  initialAvatarUrl: string | null
  joinedAt: string
  groupCount: number
  dropCount: number
}

export default function ProfileForm({
  userId,
  email,
  initialName,
  initialAvatarUrl,
  joinedAt,
  groupCount,
  dropCount,
}: Props) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(initialName)
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Name cannot be empty.'); return }
    setSaving(true)
    setError(null)

    try {
      const supabase = createClient()
      let newAvatarUrl = avatarUrl

      // Upload new avatar if changed
      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop()
        const path = `${userId}/avatar.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from('avatars')
          .upload(path, avatarFile, { upsert: true })
        if (uploadErr) throw uploadErr

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(path)
        newAvatarUrl = publicUrl
        setAvatarUrl(publicUrl)
        setAvatarFile(null)
        setAvatarPreview(null)
      }

      // Update user record
      const { error: updateErr } = await supabase
        .from('users')
        .update({ name: name.trim(), avatar_url: newAvatarUrl })
        .eq('id', userId)
      if (updateErr) throw updateErr

      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSignOut() {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const displayAvatar = avatarPreview ?? avatarUrl
  const initials = getInitials(name || email)

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-8 space-y-6">
      {/* Header */}
      <h1 className="font-display text-2xl font-bold text-bark-900">Profile</h1>

      {/* Avatar + stats hero */}
      <div className="bg-gradient-to-br from-honey-500 to-ember-500 rounded-3xl p-6 flex items-center gap-5">
        {/* Avatar */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="relative flex-shrink-0 group"
        >
          <div className="w-20 h-20 rounded-full overflow-hidden bg-honey-300 flex items-center justify-center text-2xl font-bold text-bark-900 ring-4 ring-white/40">
            {displayAvatar ? (
              <Image src={displayAvatar} alt={name} width={80} height={80} className="object-cover w-full h-full" />
            ) : (
              initials
            )}
          </div>
          <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="text-white text-xs font-semibold">Edit</span>
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow text-sm">
            📷
          </div>
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />

        {/* Stats */}
        <div className="text-white flex-1">
          <p className="font-display text-xl font-bold leading-tight">{name || 'Your name'}</p>
          <p className="text-honey-100 text-sm mt-0.5 truncate">{email}</p>
          <div className="flex gap-4 mt-3">
            <div>
              <p className="text-white font-bold text-lg leading-none">{groupCount}</p>
              <p className="text-honey-100 text-xs">groups</p>
            </div>
            <div>
              <p className="text-white font-bold text-lg leading-none">{dropCount}</p>
              <p className="text-honey-100 text-xs">drops</p>
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-none mt-0.5">{formatDate(joinedAt)}</p>
              <p className="text-honey-100 text-xs">joined</p>
            </div>
          </div>
        </div>
      </div>

      {/* Edit form */}
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-bark-800 mb-1.5">Display name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            required
            maxLength={60}
            className="w-full px-4 py-3 bg-white border border-cream-200 rounded-2xl text-bark-900 placeholder-stone-warm-400 focus:border-honey-500 focus:ring-2 focus:ring-honey-500/20 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-bark-800 mb-1.5">Email</label>
          <div className="w-full px-4 py-3 bg-cream-100 border border-cream-200 rounded-2xl text-stone-warm-500 text-sm select-all">
            {email}
          </div>
          <p className="text-xs text-stone-warm-400 mt-1 ml-1">Email can't be changed here</p>
        </div>

        {avatarFile && (
          <p className="text-xs text-honey-600 font-medium ml-1">
            📷 New photo ready — tap Save to apply
          </p>
        )}

        {error && (
          <p className="text-red-600 text-sm bg-red-50 px-4 py-2.5 rounded-2xl border border-red-100">{error}</p>
        )}

        {saved && (
          <p className="text-green-600 text-sm bg-green-50 px-4 py-2.5 rounded-2xl border border-green-100">
            ✓ Profile saved!
          </p>
        )}

        <Button type="submit" fullWidth size="lg" loading={saving}>
          Save changes
        </Button>
      </form>

      {/* Divider */}
      <div className="border-t border-cream-200" />

      {/* Password */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-bark-800">Password</h2>
        <Link
          href="/forgot-password"
          className="flex items-center justify-between px-4 py-3 bg-cream-100 border border-cream-200 rounded-2xl hover:bg-cream-200 transition-colors"
        >
          <span className="text-sm text-bark-800">Change password</span>
          <span className="text-stone-warm-400">›</span>
        </Link>
      </div>

      {/* Sign out */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-bark-800">Account</h2>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full flex items-center justify-between px-4 py-3 bg-cream-100 border border-cream-200 rounded-2xl hover:bg-red-50 hover:border-red-200 transition-colors disabled:opacity-50"
        >
          <span className="text-sm text-red-600 font-medium">
            {signingOut ? 'Signing out…' : 'Sign out'}
          </span>
          <span className="text-red-400">›</span>
        </button>
      </div>
    </div>
  )
}
