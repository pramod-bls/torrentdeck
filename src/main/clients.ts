/**
 * Per-profile adapter cache, shared by the IPC dispatch and the watch-folder
 * scanner so they reuse one connection (and, for Transmission, one CSRF session
 * id) instead of each opening their own. Editing/deleting a profile evicts it.
 */
import { createAdapter, type TorrentClient } from './rpc/adapters'
import * as profiles from './profiles'

const clients = new Map<string, TorrentClient>()

export function clientFor(profileId: string): TorrentClient | null {
  const cached = clients.get(profileId)
  if (cached) return cached
  const profile = profiles.getProfile(profileId)
  if (!profile) return null
  const client = createAdapter(profile, profiles.getPassword(profileId))
  clients.set(profileId, client)
  return client
}

export function evictClient(profileId: string): void {
  clients.delete(profileId)
}
