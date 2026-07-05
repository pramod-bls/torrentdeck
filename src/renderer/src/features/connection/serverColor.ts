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
export function deriveServerColor(profileId: string): string {
  const hue = Math.round((hashId(profileId) * 137.508) % 360)
  return `hsl(${hue} 62% 72%)`
}

/**
 * User color overrides, keyed by profile id. Kept in sync with the persisted
 * profiles (see connectionSlice) so `serverColor` stays a plain synchronous
 * lookup usable anywhere in render. Empty = everyone uses their derived color.
 */
const overrides: Record<string, string> = {}

/** Replace the whole override map (e.g. after profiles load). */
export function setServerColorOverrides(profiles: { id: string; color?: string }[]): void {
  for (const k of Object.keys(overrides)) delete overrides[k]
  for (const p of profiles) if (p.color) overrides[p.id] = p.color
}

/** Set or clear one server's override. */
export function setServerColorOverride(id: string, color?: string): void {
  if (color) overrides[id] = color
  else delete overrides[id]
}

/** The color to display for a server: its override if set, else derived. */
export function serverColor(profileId: string): string {
  return overrides[profileId] ?? deriveServerColor(profileId)
}
