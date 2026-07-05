/**
 * The complete IPC surface of the app — every `ipcMain.handle` channel the
 * preload bridge can invoke. Channel names and payload shapes must stay in
 * lockstep with `Api` in `src/shared/types.ts` and `src/preload/index.ts`.
 *
 * Clients are cached per profile so the Transmission CSRF session id survives
 * across calls; editing a profile evicts its cache entry (credentials or TLS
 * settings may have changed).
 */
import { app, clipboard, dialog, ipcMain, shell } from 'electron'
import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'
import type {
  InvokeRequest,
  ProfileInput,
  RpcResult,
  SortPref,
  TorrentFilePayload,
  WorkspaceLayout
} from '@shared/types'
import { createAdapter, type TorrentClient } from './rpc/adapters'
import { clientFor, evictClient } from './clients'
import { scheduleMagnetSizeFilter } from './sizeFilterWatch'
import { logFilePath } from './logger'
import type {
  AddTorrentParams,
  QueueDirection,
  TorrentActionKind
} from './rpc/adapters/types'
import type { BandwidthGroup, SessionInfo } from '@shared/transmission'
import * as profiles from './profiles'

/** Route one intent-level op to the active profile's adapter. Params are the
 * loose renderer payload; each case narrows them to the adapter's signature. */
function dispatch(
  client: TorrentClient,
  profileId: string,
  op: InvokeRequest['op'],
  p: Record<string, unknown>
): Promise<RpcResult> {
  switch (op) {
    case 'getCapabilities':
      return client.getCapabilities()
    case 'getSession':
      return client.getSession()
    case 'setSession':
      return client.setSession(p.fields as Partial<SessionInfo>)
    case 'getSessionStats':
      return client.getSessionStats()
    case 'portTest':
      return client.portTest()
    case 'blocklistUpdate':
      return client.blocklistUpdate()
    case 'getGroups':
      return client.getGroups()
    case 'setGroup':
      return client.setGroup(p.group as Partial<BandwidthGroup> & { name: string })
    case 'freeSpace':
      return client.freeSpace(p.path as string)
    case 'getTorrents':
      return client.getTorrents()
    case 'getTorrentDetail':
      return client.getTorrentDetail(p.id as string)
    case 'torrentAction':
      return client.torrentAction(p.action as TorrentActionKind, p.ids as string[])
    case 'queueMove':
      return client.queueMove(p.direction as QueueDirection, p.ids as string[])
    case 'removeTorrent':
      return client.removeTorrent(p.ids as string[], p.deleteData as boolean)
    case 'addTorrent':
      return handleAddTorrent(client, profileId, p as AddTorrentParams)
    case 'setTorrent':
      return client.setTorrent(p.ids as string[], p.fields as Record<string, unknown>)
    case 'renamePath':
      return client.renamePath(p.id as string, p.path as string, p.name as string)
    case 'setLocation':
      return client.setLocation(p.ids as string[], p.location as string, p.move as boolean)
    default:
      return Promise.resolve({ ok: false, error: { kind: 'unknown', message: `Unknown op: ${op}` } })
  }
}

/** Add a torrent, injecting the profile's Size Threshold and, for magnets on a
 *  threshold-enabled server, scheduling the best-effort post-add size filter. */
async function handleAddTorrent(
  client: TorrentClient,
  profileId: string,
  params: AddTorrentParams
): Promise<RpcResult> {
  const threshold = profiles.getProfile(profileId)?.sizeThresholdBytes ?? 0
  const res = await client.addTorrent({ ...params, sizeThresholdBytes: threshold || undefined })
  // Magnets have no file list at add time; filter once metadata arrives. (For
  // a .torrent the renderer already sent the unwanted set; the daemon knows the
  // files immediately, so no watcher is needed.)
  if (res.ok && res.data.added && params.magnet && !params.metainfoBase64 && threshold > 0) {
    scheduleMagnetSizeFilter(client, res.data.added.id, threshold)
  }
  return res
}

async function readTorrentFiles(paths: string[]): Promise<TorrentFilePayload[]> {
  const out: TorrentFilePayload[] = []
  for (const p of paths) {
    if (!p.toLowerCase().endsWith('.torrent')) continue
    try {
      out.push({ name: basename(p), base64: (await readFile(p)).toString('base64') })
    } catch {
      // unreadable file: skip; the add dialog reports nothing was added
    }
  }
  return out
}

export function registerIpc(): void {
  ipcMain.handle('rpc:invoke', async (_e, req: InvokeRequest): Promise<RpcResult> => {
    const client = clientFor(req.profileId)
    if (!client) {
      return { ok: false, error: { kind: 'unknown', message: 'Unknown server profile' } }
    }
    try {
      return await dispatch(client, req.profileId, req.op, req.params ?? {})
    } catch (err) {
      return { ok: false, error: { kind: 'unknown', message: (err as Error).message } }
    }
  })

  ipcMain.handle('rpc:test', async (_e, input: ProfileInput): Promise<RpcResult> => {
    try {
      const client = createAdapter(input, input.password)
      return await client.test()
    } catch (err) {
      return { ok: false, error: { kind: 'unknown', message: (err as Error).message } }
    }
  })

  ipcMain.handle('profiles:list', () => profiles.listProfiles())
  ipcMain.handle('profiles:save', (_e, input: ProfileInput) => {
    const saved = profiles.saveProfile(input)
    evictClient(saved.id)
    return saved
  })
  ipcMain.handle('profiles:delete', (_e, id: string) => {
    profiles.deleteProfile(id)
    evictClient(id)
  })
  ipcMain.handle('profiles:setSort', (_e, id: string, sort: SortPref) =>
    profiles.setProfileSort(id, sort)
  )

  ipcMain.handle('prefs:get', () => profiles.getPrefs())
  ipcMain.handle('prefs:set', (_e, partial) => profiles.setPrefs(partial))

  ipcMain.handle('workspace:get', () => profiles.getWorkspace())
  ipcMain.handle('workspace:set', (_e, layout: WorkspaceLayout) => profiles.setWorkspace(layout))

  ipcMain.handle('dialog:pickTorrentFiles', async (): Promise<TorrentFilePayload[]> => {
    const res = await dialog.showOpenDialog({
      title: 'Add torrent files',
      filters: [{ name: 'Torrent files', extensions: ['torrent'] }],
      properties: ['openFile', 'multiSelections']
    })
    if (res.canceled) return []
    return readTorrentFiles(res.filePaths)
  })

  ipcMain.handle('dialog:pickDirectory', async (): Promise<string | null> => {
    const res = await dialog.showOpenDialog({
      title: 'Choose a folder',
      properties: ['openDirectory', 'createDirectory']
    })
    return res.canceled ? null : (res.filePaths[0] ?? null)
  })

  ipcMain.handle('fs:readDroppedTorrents', (_e, paths: string[]) => readTorrentFiles(paths))

  ipcMain.handle('clipboard:readText', () => clipboard.readText())
  ipcMain.handle('app:version', () => app.getVersion())

  ipcMain.handle('logs:read', async (): Promise<string> => {
    try {
      const path = logFilePath()
      if (!path) return ''
      const buf = await readFile(path)
      // last ~64 KB is plenty for a viewer; avoids loading a rotated 5 MB file
      const slice = buf.subarray(Math.max(0, buf.length - 64 * 1024)).toString('utf8')
      return buf.length > 64 * 1024 ? slice.slice(slice.indexOf('\n') + 1) : slice
    } catch {
      return ''
    }
  })
  ipcMain.handle('logs:reveal', () => {
    const path = logFilePath()
    if (path) shell.showItemInFolder(path)
  })
}
