/**
 * Preload bridge: the only doorway between the sandboxed renderer and the
 * main process. Exposes `window.api` (typed by `Api` in shared/types.ts plus
 * two preload-only helpers). Compiled to CJS (`index.cjs`) because sandboxed
 * preloads cannot load ESM — see electron.vite.config.ts.
 *
 * `getPathForFile` exists because `File.path` was removed from Electron;
 * `webUtils` is only reachable from a preload, so drag-and-drop path
 * resolution has to live here.
 */
import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type {
  Api,
  AppPrefs,
  InvokeRequest,
  ProfileInput,
  SortPref,
  TorrentFilePayload,
  WorkspaceLayout
} from '../shared/types'

function subscribe<T>(channel: string, cb: (payload: T) => void): () => void {
  const listener = (_e: Electron.IpcRendererEvent, payload: T): void => cb(payload)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

const api: Api & { getPathForFile: (file: File) => string; rendererReady: () => void } = {
  invoke: (req: InvokeRequest) => ipcRenderer.invoke('rpc:invoke', req),
  testConnection: (input: ProfileInput) => ipcRenderer.invoke('rpc:test', input),
  profiles: {
    list: () => ipcRenderer.invoke('profiles:list'),
    save: (input: ProfileInput) => ipcRenderer.invoke('profiles:save', input),
    remove: (id: string) => ipcRenderer.invoke('profiles:delete', id),
    setSort: (id: string, sort: SortPref) => ipcRenderer.invoke('profiles:setSort', id, sort)
  },
  prefs: {
    get: () => ipcRenderer.invoke('prefs:get'),
    set: (prefs: Partial<AppPrefs>) => ipcRenderer.invoke('prefs:set', prefs)
  },
  workspace: {
    get: () => ipcRenderer.invoke('workspace:get'),
    set: (layout: WorkspaceLayout) => ipcRenderer.invoke('workspace:set', layout)
  },
  updates: {
    check: () => ipcRenderer.invoke('updates:check')
  },
  pickTorrentFiles: () => ipcRenderer.invoke('dialog:pickTorrentFiles'),
  readDroppedTorrents: (paths: string[]) => ipcRenderer.invoke('fs:readDroppedTorrents', paths),
  readClipboardText: () => ipcRenderer.invoke('clipboard:readText'),
  focusWindow: () => ipcRenderer.invoke('app:focusWindow'),
  setTraySpeeds: (down: number, up: number) => ipcRenderer.send('tray:setSpeeds', down, up),
  onOpenMagnet: (cb: (url: string) => void) => subscribe('open-magnet', cb),
  onOpenTorrentFiles: (cb: (files: TorrentFilePayload[]) => void) =>
    subscribe('open-torrent-files', cb),
  getPathForFile: (file: File) => webUtils.getPathForFile(file),
  rendererReady: () => void ipcRenderer.invoke('app:rendererReady')
}

contextBridge.exposeInMainWorld('api', api)
