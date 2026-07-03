/**
 * Adapter factory: turns a saved profile into the right `TorrentClient`
 * implementation for its `serverType` (ADR-0004). This is the single place
 * that knows the mapping from server type to protocol client.
 */
import type { ServerProfile } from '@shared/types'
import { TransmissionClient } from '../client'
import { TransmissionAdapter } from './transmission'
import type { TorrentClient } from './types'

export type { TorrentClient } from './types'

export function createAdapter(
  profile: Pick<
    ServerProfile,
    'serverType' | 'host' | 'port' | 'useTls' | 'allowSelfSignedCert' | 'rpcPath' | 'username'
  >,
  password?: string
): TorrentClient {
  switch (profile.serverType) {
    case 'deluge':
      // Wired in Phase 2 (Deluge adapter). No Deluge profiles exist yet, so
      // this is unreachable until then.
      throw new Error('Deluge support is not available yet')
    case 'transmission':
    default:
      return new TransmissionAdapter(
        new TransmissionClient({
          host: profile.host,
          port: profile.port,
          useTls: profile.useTls,
          allowSelfSignedCert: profile.allowSelfSignedCert,
          rpcPath: profile.rpcPath || '/transmission/rpc',
          username: profile.username || undefined,
          password
        })
      )
  }
}
