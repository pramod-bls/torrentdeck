/**
 * Per-server feature flags (ADR-0004). The active profile's adapter reports
 * what the daemon supports; the UI hides controls a server can't honor rather
 * than letting them fail. See `can()` for the loading-state policy.
 */
import type { Capabilities } from '@shared/types'
import { useGetCapabilitiesQuery } from '@/services/rpcApi'

export function useServerCapabilities(
  profileId: string | null | undefined
): Capabilities | undefined {
  const { data } = useGetCapabilitiesQuery({ profileId: profileId ?? '' }, { skip: !profileId })
  return data
}

/**
 * Permissive while loading: an unknown capability reads as SUPPORTED, so
 * Transmission (which supports everything) never flickers its controls. Only a
 * definite `false` from the adapter hides a control.
 */
export function can(caps: Capabilities | undefined, key: keyof Capabilities): boolean {
  return caps?.[key] !== false
}
