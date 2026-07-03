/**
 * The complete IPC surface of the app — every `ipcMain.handle` channel the
 * preload bridge can invoke. Channel names and payload shapes must stay in
 * lockstep with `Api` in `src/shared/types.ts` and `src/preload/index.ts`.
 *
 * Clients are cached per profile so the Transmission CSRF session id survives
 * across calls; editing a profile evicts its cache entry (credentials or TLS
 * settings may have changed).
 */
import { clipboard, dialog, ipcMain } from 'electron'
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
import type {
  AddTorrentParams,
  QueueDirection,
  TorrentActionKind
} from './rpc/adapters/types'
import type { BandwidthGroup, SessionInfo } from '@shared/transmission'
import * as profiles from './profiles'

const clients = new Map<string, TorrentClient>()

function clientFor(profileId: string): TorrentClient | null {
  const cached = clients.get(profileId)
  if (cached) return cached
  const profile = profiles.getProfile(profileId)
  if (!profile) return null
  const client = createAdapter(profile, profiles.getPassword(profileId))
  clients.set(profileId, client)
  return client
}

/** Route one intent-level op to the active profile's adapter. Params are the
 * loose renderer payload; each case narrows them to the adapter's signature. */
function dispatch(client: TorrentClient, op: InvokeRequest['op'], p: Record<string, unknown>): Promise<RpcResult> {
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
      return client.addTorrent(p as AddTorrentParams)
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
      return await dispatch(client, req.op, req.params ?? {})
    } catch (err) {
      return { ok: false, error: { kind: 'unknown', message: (err as Error).message } }
    }
  })

  ipcMain.handle('rpc:test', async (_e, input: ProfileInput): Promise<RpcResult> => {
    try {
      const client = createAdapter(input)
      return await client.test()
    } catch (err) {
      return { ok: false, error: { kind: 'unknown', message: (err as Error).message } }
    }
  })

  ipcMain.handle('profiles:list', () => profiles.listProfiles())
  ipcMain.handle('profiles:save', (_e, input: ProfileInput) => {
    const saved = profiles.saveProfile(input)
    clients.delete(saved.id)
    return saved
  })
  ipcMain.handle('profiles:delete', (_e, id: string) => {
    profiles.deleteProfile(id)
    clients.delete(id)
  })
  ipcMain.handle('profiles:getActiveId', () => profiles.getActiveProfileId())
  ipcMain.handle('profiles:setActiveId', (_e, id: string | null) => profiles.setActiveProfileId(id))
  ipcMain.handle('profiles:setSort', (_e, id: string, sort: SortPref) =>
    profiles.setProfileSort(id, sort)
  )

  ipcMain.handle('prefs:get', () => profiles.getPrefs())
  ipcMain.handle('prefs:set', (_e, partial) => profiles.setPrefs(partial))

  ipcMain.handle('workspace:get', (_e, profileId: string) => profiles.getWorkspace(profileId))
  ipcMain.handle('workspace:set', (_e, profileId: string, layout: WorkspaceLayout) =>
    profiles.setWorkspace(profileId, layout)
  )

  ipcMain.handle('dialog:pickTorrentFiles', async (): Promise<TorrentFilePayload[]> => {
    const res = await dialog.showOpenDialog({
      title: 'Add torrent files',
      filters: [{ name: 'Torrent files', extensions: ['torrent'] }],
      properties: ['openFile', 'multiSelections']
    })
    if (res.canceled) return []
    return readTorrentFiles(res.filePaths)
  })

  ipcMain.handle('fs:readDroppedTorrents', (_e, paths: string[]) => readTorrentFiles(paths))

  ipcMain.handle('clipboard:readText', () => clipboard.readText())
}
