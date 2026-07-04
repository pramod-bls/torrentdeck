/**
 * Client-side watch folders (docs/adr/0006-watch-folders.md). While the app is
 * open, periodically scan each Server Profile's configured folder for new
 * `.torrent` files and add them to that server over RPC (so it works with a
 * remote daemon — the bytes travel in the add call). Ingested files move to
 * `.added/`; permanently rejected ones to `.failed/`; transient failures are
 * left in place to retry. The profile's Size Filter is applied on add.
 */
import { Notification } from 'electron'
import { mkdir, readdir, readFile, rename, stat } from 'node:fs/promises'
import { join } from 'node:path'
import type { ServerProfile } from '@shared/types'
import { parseTorrentPreview } from '@shared/bencode'
import { unwantedBySizeThreshold } from '@shared/sizeFilter'
import { clientFor } from './clients'
import * as profiles from './profiles'
import { log } from './logger'

const SCAN_MS = 10_000
const DONE_DIR = '.added'
const FAIL_DIR = '.failed'

/** path -> size seen on the previous scan, for the stability guard. */
const lastSize = new Map<string, number>()
let timer: ReturnType<typeof setInterval> | null = null

function notify(title: string, body: string): void {
  if (!profiles.getPrefs().notifyOnComplete) return
  try {
    new Notification({ title, body }).show()
  } catch {
    // notifications unavailable (e.g. headless) — non-fatal
  }
}

async function moveOut(dir: string, sub: string, name: string): Promise<void> {
  const destDir = join(dir, sub)
  await mkdir(destDir, { recursive: true }).catch(() => undefined)
  const dest = join(destDir, name)
  try {
    await rename(join(dir, name), dest)
  } catch {
    // name collision or race — disambiguate and retry once
    await rename(join(dir, name), join(destDir, `${Date.now()}-${name}`)).catch(() => undefined)
  }
}

async function ingest(profile: ServerProfile, dir: string, name: string): Promise<void> {
  const wf = profile.watchFolder
  if (!wf) return
  const client = clientFor(profile.id)
  if (!client) return

  let base64: string
  try {
    base64 = (await readFile(join(dir, name))).toString('base64')
  } catch {
    return // unreadable this pass; try again next scan
  }

  const preview = parseTorrentPreview(base64)
  const unwanted = preview ? unwantedBySizeThreshold(preview.files, profile.sizeThresholdBytes ?? 0) : []

  const res = await client.addTorrent({
    metainfoBase64: base64,
    downloadDir: wf.downloadDir || undefined,
    paused: wf.paused,
    labels: wf.label ? [wf.label] : undefined,
    unwantedIndices: unwanted.length ? unwanted : undefined
  })

  if (res.ok) {
    // added or duplicate → handled
    await moveOut(dir, DONE_DIR, name)
    lastSize.delete(join(dir, name))
    if (res.data.added) {
      log.info(`watch-folder: added "${res.data.added.name}" to ${profile.name}`)
      notify('Torrent added', `${res.data.added.name} — ${profile.name}`)
    }
  } else if (res.error.kind === 'rpc' || res.error.kind === 'http') {
    // the daemon rejected it (bad/corrupt .torrent) → permanent
    await moveOut(dir, FAIL_DIR, name)
    lastSize.delete(join(dir, name))
    log.warn(`watch-folder: failed to add "${name}" to ${profile.name}: ${res.error.message}`)
    notify('Watch folder: add failed', `${name} — ${profile.name}`)
  }
  // transient (network/timeout/auth): leave in place, retry next scan
}

async function scanProfile(profile: ServerProfile): Promise<void> {
  const wf = profile.watchFolder
  if (!wf?.enabled || !wf.path) return
  let entries: string[]
  try {
    entries = await readdir(wf.path)
  } catch {
    return // folder missing/unreadable
  }
  const present = new Set<string>()
  for (const name of entries) {
    if (!name.toLowerCase().endsWith('.torrent')) continue
    const full = join(wf.path, name)
    present.add(full)
    let size: number
    try {
      size = (await stat(full)).size
    } catch {
      continue
    }
    const prev = lastSize.get(full)
    lastSize.set(full, size)
    // Only ingest once the size is stable across two scans (fully written).
    if (prev === size) await ingest(profile, wf.path, name)
  }
  // Prune stability records for files no longer in this folder.
  for (const key of lastSize.keys()) {
    if (key.startsWith(wf.path) && !present.has(key)) lastSize.delete(key)
  }
}

async function scanAll(): Promise<void> {
  for (const profile of profiles.listProfiles()) {
    try {
      await scanProfile(profile)
    } catch (err) {
      log.warn(`watch-folder: scan error for ${profile.name}`, err)
    }
  }
}

/** Begin scanning (idempotent). Runs a sweep shortly after start, then every
 *  SCAN_MS. Profiles are re-read each pass, so toggling a watch folder takes
 *  effect without a restart. */
export function startWatchFolders(): void {
  if (timer) return
  setTimeout(() => void scanAll(), 3000) // startup sweep
  timer = setInterval(() => void scanAll(), SCAN_MS)
}
