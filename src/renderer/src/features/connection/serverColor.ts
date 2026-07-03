/**
 * A stable pastel color per server, derived deterministically from its profile
 * id (no persistence, no reshuffle across restarts, no collision bookkeeping).
 * Used to tint panel headers and mark servers wherever they're listed, so
 * "whose data is this?" is answerable at a glance.
 */

/** FNV-1a-ish string hash → 32-bit unsigned. */
function hashId(id: string): number {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * Deterministic pastel for a server. Hue spread across the wheel via the
 * golden angle for good separation between nearby ids; fixed saturation and a
 * high lightness keep every result a soft pastel that reads on light and dark
 * surfaces alike.
 */
export function serverColor(profileId: string): string {
  const hue = Math.round((hashId(profileId) * 137.508) % 360)
  return `hsl(${hue} 62% 72%)`
}
