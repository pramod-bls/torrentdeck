import { describe, expect, it } from 'vitest'
import { bucketize, countHave, decodeBitfield } from './pieces'

const b64 = (...bytes: number[]): string => btoa(String.fromCharCode(...bytes))

describe('decodeBitfield', () => {
  it('decodes a full byte of ones', () => {
    expect([...decodeBitfield(b64(0xff), 8)]).toEqual([1, 1, 1, 1, 1, 1, 1, 1])
  })

  it('decodes MSB-first: 0xAA = 10101010', () => {
    expect([...decodeBitfield(b64(0xaa), 8)]).toEqual([1, 0, 1, 0, 1, 0, 1, 0])
  })

  it('truncates to pieceCount and ignores padding bits', () => {
    // 0xE0 = 11100000, but only 3 pieces exist
    expect([...decodeBitfield(b64(0xe0), 3)]).toEqual([1, 1, 1])
  })

  it('spans multiple bytes', () => {
    // 0x80 0x01 over 16 pieces: piece 0 and piece 15
    const bits = decodeBitfield(b64(0x80, 0x01), 16)
    expect(bits[0]).toBe(1)
    expect(bits[15]).toBe(1)
    expect(countHave(bits)).toBe(2)
  })

  it('handles empty/garbage input safely', () => {
    expect(countHave(decodeBitfield('', 10))).toBe(0)
    expect(countHave(decodeBitfield('!!!not-base64!!!', 10))).toBe(0)
    expect(decodeBitfield(b64(0xff), 0).length).toBe(0)
  })
})

describe('bucketize', () => {
  it('averages piece ranges into buckets', () => {
    // 8 pieces: first half have, second half missing → 2 buckets = [1, 0]
    const bits = decodeBitfield(b64(0xf0), 8)
    expect([...bucketize(bits, 2)]).toEqual([1, 0])
  })

  it('produces fractional buckets for mixed ranges', () => {
    const bits = decodeBitfield(b64(0xaa), 8) // alternating
    const buckets = bucketize(bits, 2)
    expect(buckets[0]).toBeCloseTo(0.5)
    expect(buckets[1]).toBeCloseTo(0.5)
  })

  it('handles more buckets than pieces', () => {
    const bits = decodeBitfield(b64(0x80), 2) // [1, 0]
    const buckets = bucketize(bits, 4)
    expect([...buckets]).toEqual([1, 1, 0, 0])
  })
})
