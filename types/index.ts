export interface User {
  id: string
  name: string
  avatar_url: string | null
  created_at: string
}

export interface Group {
  id: string
  name: string
  cover_photo_url: string | null
  submission_day: number // 0=Sun … 6=Sat
  timezone: string // IANA timezone string
  invite_code: string
  created_by: string
  captain_index: number
  created_at: string
}

export interface GroupMember {
  id: string
  group_id: string
  user_id: string
  role: 'admin' | 'member'
  joined_at: string
  user?: User
}

export type CycleStatus = 'pending' | 'captain_set' | 'mutiny' | 'published'

export interface WeeklyCycle {
  id: string
  group_id: string
  week_start: string // date string YYYY-MM-DD
  deadline_at: string // timestamptz ISO string
  captain_id: string | null
  caption: string | null
  song: string | null
  status: CycleStatus
  mutiny_captions: string[] | null
  created_at: string
}

export interface Submission {
  id: string
  cycle_id: string
  user_id: string
  media_url: string // storage path
  media_type: 'photo' | 'video'
  thumbnail_url: string | null // storage path for video thumbnails
  private_note: string | null
  submitted_at: string
  user?: User
}

export interface CaptionVote {
  id: string
  cycle_id: string
  user_id: string
  caption_option: 0 | 1 | 2
  voted_at: string
}

export interface VaultPost {
  id: string
  cycle_id: string
  group_id: string
  published_at: string
  final_caption: string
  final_song: string | null
  photo_order: string[] // ordered array of submission IDs
  cycle?: WeeklyCycle
  submissions?: SubmissionWithUrl[]
}

export interface SubmissionWithUrl extends Submission {
  signed_url: string
  thumbnail_signed_url?: string
}

export type NotificationType = 'captain_selected' | 'reminder' | 'post_published' | 'mutiny'

export interface Notification {
  id: string
  user_id: string
  group_id: string | null
  type: NotificationType
  message: string
  read: boolean
  created_at: string
  group?: Group
}

// Composite types for page data

export interface GroupWithCycle extends Group {
  current_cycle: WeeklyCycle | null
  member_count: number
  user_submitted: boolean
}

export interface GroupPageData {
  group: Group
  members: GroupMember[]
  current_cycle: WeeklyCycle | null
  user_submission: Submission | null
  is_captain: boolean
  submission_count: number
}
