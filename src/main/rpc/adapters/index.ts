/**
 * Adapter factory: turns a saved profile into the right `TorrentClient`
 * implementation for its `serverType` (ADR-0004). This is the single place
 * that knows the mapping from server type to protocol client.
 */
import type { ServerProfile } from '@shared/types'
import { TransmissionClient } from '../client'
import { DelugeClient } from '../deluge/client'
import { TransmissionAdapter } from './transmission'
import { DelugeAdapter } from './deluge'
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
      return new DelugeAdapter(
        new DelugeClient({
          host: profile.host,
          port: profile.port,
          useTls: profile.useTls,
          allowSelfSignedCert: profile.allowSelfSignedCert,
          rpcPath: profile.rpcPath || '/json',
          password
        })
      )
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
