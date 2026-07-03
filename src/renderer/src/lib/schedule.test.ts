import { describe, expect, it } from 'vitest'
import { ALL_DAYS, formatDays, hhmmToMinutes, isDayEnabled, minutesToHHMM, toggleDay } from './schedule'

describe('time conversion', () => {
  it('round-trips minutes and HH:MM', () => {
    expect(minutesToHHMM(540)).toBe('09:00')
    expect(minutesToHHMM(1020)).toBe('17:00')
    expect(minutesToHHMM(0)).toBe('00:00')
    expect(hhmmToMinutes('09:00')).toBe(540)
    expect(hhmmToMinutes('23:59')).toBe(1439)
  })

  it('rejects invalid times', () => {
    expect(hhmmToMinutes('24:00')).toBeNull()
    expect(hhmmToMinutes('9:99')).toBeNull()
    expect(hhmmToMinutes('nonsense')).toBeNull()
  })
})

describe('day bitmask', () => {
  it('reads and toggles days (bit 0 = Sunday)', () => {
    expect(isDayEnabled(ALL_DAYS, 0)).toBe(true)
    expect(isDayEnabled(0, 3)).toBe(false)
    expect(toggleDay(0, 1)).toBe(0b0000010)
    expect(toggleDay(0b0000010, 1)).toBe(0)
  })

  it('formats common masks', () => {
    expect(formatDays(ALL_DAYS)).toBe('Every day')
    expect(formatDays(0)).toBe('No days')
    expect(formatDays(0b0111110)).toBe('Weekdays')
    expect(formatDays(0b1000001)).toBe('Weekends')
    expect(formatDays(0b0000001)).toBe('Sun')
  })
})
