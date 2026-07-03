/**
 * Decoding for Transmission's `pieces` bitfield: base64 over bytes where the
 * MOST significant bit of byte 0 is piece 0. Pure functions, no DOM.
 */

/** One entry per piece: 1 = the daemon has verified it, 0 = missing. */
export function decodeBitfield(base64: string, pieceCount: number): Uint8Array {
  const bits = new Uint8Array(Math.max(0, pieceCount))
  if (!base64 || pieceCount <= 0) return bits
  let bytes: string
  try {
    bytes = atob(base64)
  } catch {
    return bits
  }
  for (let i = 0; i < pieceCount; i++) {
    const byte = bytes.charCodeAt(i >> 3)
    if (Number.isNaN(byte)) break
    bits[i] = (byte >> (7 - (i & 7))) & 1
  }
  return bits
}

export function countHave(bits: Uint8Array): number {
  let n = 0
  for (let i = 0; i < bits.length; i++) n += bits[i]
  return n
}

/**
 * Fraction of have-pieces per bucket, for pixel-mapped rendering. Buckets map
 * contiguous piece ranges; when there are fewer pieces than buckets, several
 * buckets share one piece (fraction 0 or 1).
 */
export function bucketize(bits: Uint8Array, buckets: number): Float32Array {
  const out = new Float32Array(Math.max(0, buckets))
  const n = bits.length
  if (n === 0 || buckets <= 0) return out
  for (let b = 0; b < buckets; b++) {
    const start = Math.floor((b * n) / buckets)
    const end = Math.max(start + 1, Math.floor(((b + 1) * n) / buckets))
    let have = 0
    for (let i = start; i < end; i++) have += bits[i]
    out[b] = have / (end - start)
  }
  return out
}
