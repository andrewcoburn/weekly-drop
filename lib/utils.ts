import type { Group, WeeklyCycle } from '@/types'

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function getDayName(day: number): string {
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day]
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export function formatShortDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function getTimeUntilDeadline(deadlineAt: string): string {
  const deadline = new Date(deadlineAt)
  const now = new Date()
  const diff = deadline.getTime() - now.getTime()

  if (diff <= 0) return 'Deadline passed'

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (days > 0) return `${days}d ${hours}h left`
  if (hours > 0) return `${hours}h ${minutes}m left`
  return `${minutes}m left`
}

export function isDeadlineSoon(deadlineAt: string): boolean {
  const deadline = new Date(deadlineAt)
  const now = new Date()
  const hoursLeft = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60)
  return hoursLeft <= 24 && hoursLeft > 0
}

/** Compute the next deadline date (23:59:59) in the group's timezone */
export function computeNextDeadline(submissionDay: number, timezone: string): Date {
  // Find the next occurrence of submissionDay in the group's timezone
  const now = new Date()
  // Get current day of week in target timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = formatter.formatToParts(now)
  const currentDayStr = parts.find((p) => p.type === 'weekday')?.value
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const currentDay = days.indexOf(currentDayStr ?? 'Sun')

  let daysUntil = submissionDay - currentDay
  if (daysUntil <= 0) daysUntil += 7

  const deadline = new Date(now)
  deadline.setDate(deadline.getDate() + daysUntil)

  // Set to 23:59:59 in group timezone — get that moment as UTC
  const dateStr = deadline.toLocaleDateString('en-CA', { timeZone: timezone }) // YYYY-MM-DD
  const [year, month, day] = dateStr.split('-').map(Number)
  const localDeadlineStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T23:59:59`
  return new Date(new Date(localDeadlineStr).toLocaleString('en-US', { timeZone: timezone }))
}

/** Get the week start (Monday) for a given deadline date */
export function getWeekStart(deadlineAt: Date): string {
  const d = new Date(deadlineAt)
  const dayOfWeek = d.getDay()
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  d.setDate(d.getDate() - daysToMonday)
  return d.toISOString().split('T')[0]
}

export function isPublished(cycle: WeeklyCycle | null): boolean {
  return cycle?.status === 'published'
}

export function isCaptain(cycle: WeeklyCycle | null, userId: string): boolean {
  return cycle?.captain_id === userId
}
