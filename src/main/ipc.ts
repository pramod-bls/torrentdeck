import { dialog, ipcMain } from 'electron'
import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'
import type { ProfileInput, RpcRequest, RpcResult, SortPref, TorrentFilePayload } from '@shared/types'
import { TransmissionClient, type RpcTarget } from './rpc/client'
import * as profiles from './profiles'

const clients = new Map<string, TransmissionClient>()

function targetFor(input: {
  host: string
  port: number
  useTls: boolean
  allowSelfSignedCert: boolean
  rpcPath: string
  username: string
  password?: string
}): RpcTarget {
  return {
    host: input.host,
    port: input.port,
    useTls: input.useTls,
    allowSelfSignedCert: input.allowSelfSignedCert,
    rpcPath: input.rpcPath || '/transmission/rpc',
    username: input.username || undefined,
    password: input.password
  }
}

function clientFor(profileId: string): TransmissionClient | null {
  const cached = clients.get(profileId)
  if (cached) return cached
  const profile = profiles.getProfile(profileId)
  if (!profile) return null
  const client = new TransmissionClient(
    targetFor({ ...profile, password: profiles.getPassword(profileId) })
  )
  clients.set(profileId, client)
  return client
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
  ipcMain.handle('rpc:call', async (_e, req: RpcRequest): Promise<RpcResult> => {
    const client = clientFor(req.profileId)
    if (!client) {
      return { ok: false, error: { kind: 'unknown', message: 'Unknown server profile' } }
    }
    return client.call(req.method, req.arguments)
  })

  ipcMain.handle('rpc:test', async (_e, input: ProfileInput): Promise<RpcResult> => {
    const client = new TransmissionClient(targetFor(input))
    const res = await client.call<{ version?: string }>('session-get', {
      fields: ['version', 'rpc-version']
    })
    return res.ok ? { ok: true, data: { version: res.data.version ?? 'unknown' } } : res
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
}
