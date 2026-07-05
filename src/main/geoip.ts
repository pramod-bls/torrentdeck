/**
 * Offline IP → country lookup for the Peers tab, using a bundled DB-IP Lite
 * database (CC BY 4.0; refreshed via scripts/update-geoip.sh). No network, no
 * IP ever leaves the machine. Peer country codes are resolved in the main
 * process (see ipc.ts) and rendered as flags in the UI.
 */
import { open, type Reader, type CountryResponse } from 'maxmind'
import { join } from 'node:path'
import { app } from 'electron'
import { is } from '@electron-toolkit/utils'
import { log } from './logger'

let reader: Reader<CountryResponse> | null = null
let started = false

function dbPath(): string {
  const file = 'dbip-country-lite.mmdb'
  return is.dev
    ? join(app.getAppPath(), 'build', 'geoip', file)
    : join(process.resourcesPath, 'geoip', file)
}

/** Load the database once. Safe to call early; lookups no-op until it's ready. */
export async function initGeoip(): Promise<void> {
  if (started) return
  started = true
  try {
    reader = await open<CountryResponse>(dbPath())
    log.info('geoip: country database loaded')
  } catch (err) {
    reader = null
    log.warn('geoip: database not loaded — flags disabled', err)
  }
}

/** Bare IP from an address that may be `ip:port` (IPv4); IPv6 is left as-is. */
function cleanIp(addr: string): string {
  if (!addr) return ''
  const parts = addr.split(':')
  return parts.length === 2 ? parts[0] : addr // one colon → ipv4:port; else ipv6/bare
}

/** ISO-3166 alpha-2 country code for a peer address, or undefined. */
export function countryOf(address: string): string | undefined {
  if (!reader) return undefined
  try {
    const rec = reader.get(cleanIp(address))
    return rec?.country?.iso_code || undefined
  } catch {
    return undefined
  }
}
