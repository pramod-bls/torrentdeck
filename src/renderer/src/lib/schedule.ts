/**
 * Helpers for Transmission's alt-speed schedule: times are minutes past local
 * midnight, days are a 7-bit mask (bit 0 = Sunday … bit 6 = Saturday).
 */

export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
export const ALL_DAYS = 127

/** minutes past midnight → "HH:MM" (24h). */
export function minutesToHHMM(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440
  const h = Math.floor(m / 60)
  return `${String(h).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/** "HH:MM" → minutes past midnight; null when unparseable. */
export function hhmmToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!match) return null
  const h = Number(match[1])
  const m = Number(match[2])
  if (h > 23 || m > 59) return null
  return h * 60 + m
}

export function isDayEnabled(mask: number, day: number): boolean {
  return (mask & (1 << day)) !== 0
}

export function toggleDay(mask: number, day: number): number {
  return mask ^ (1 << day)
}

/** Human summary of a day bitmask: "Every day", "Weekdays", "Sun, Sat", … */
export function formatDays(mask: number): string {
  if (mask === ALL_DAYS) return 'Every day'
  if (mask === 0) return 'No days'
  if (mask === 0b0111110) return 'Weekdays'
  if (mask === 0b1000001) return 'Weekends'
  return DAY_LABELS.filter((_, i) => isDayEnabled(mask, i)).join(', ')
}
