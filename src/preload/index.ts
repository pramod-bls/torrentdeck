import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type {
  Api,
  AppPrefs,
  ProfileInput,
  RpcRequest,
  SortPref,
  TorrentFilePayload
} from '../shared/types'

function subscribe<T>(channel: string, cb: (payload: T) => void): () => void {
  const listener = (_e: Electron.IpcRendererEvent, payload: T): void => cb(payload)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

const api: Api & { getPathForFile: (file: File) => string; rendererReady: () => void } = {
  rpc: (req: RpcRequest) => ipcRenderer.invoke('rpc:call', req),
  testConnection: (input: ProfileInput) => ipcRenderer.invoke('rpc:test', input),
  profiles: {
    list: () => ipcRenderer.invoke('profiles:list'),
    save: (input: ProfileInput) => ipcRenderer.invoke('profiles:save', input),
    remove: (id: string) => ipcRenderer.invoke('profiles:delete', id),
    getActiveId: () => ipcRenderer.invoke('profiles:getActiveId'),
    setActiveId: (id: string | null) => ipcRenderer.invoke('profiles:setActiveId', id),
    setSort: (id: string, sort: SortPref) => ipcRenderer.invoke('profiles:setSort', id, sort)
  },
  prefs: {
    get: () => ipcRenderer.invoke('prefs:get'),
    set: (prefs: Partial<AppPrefs>) => ipcRenderer.invoke('prefs:set', prefs)
  },
  pickTorrentFiles: () => ipcRenderer.invoke('dialog:pickTorrentFiles'),
  readDroppedTorrents: (paths: string[]) => ipcRenderer.invoke('fs:readDroppedTorrents', paths),
  onOpenMagnet: (cb: (url: string) => void) => subscribe('open-magnet', cb),
  onOpenTorrentFiles: (cb: (files: TorrentFilePayload[]) => void) =>
    subscribe('open-torrent-files', cb),
  getPathForFile: (file: File) => webUtils.getPathForFile(file),
  rendererReady: () => void ipcRenderer.invoke('app:rendererReady')
}

contextBridge.exposeInMainWorld('api', api)
