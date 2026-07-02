export type SortKey =
  | 'name'
  | 'totalSize'
  | 'percentDone'
  | 'status'
  | 'rateDownload'
  | 'rateUpload'
  | 'uploadRatio'
  | 'eta'
  | 'addedDate'
  | 'queuePosition'

export interface SortPref {
  key: SortKey
  desc: boolean
}

export interface ServerProfile {
  id: string
  name: string
  host: string
  port: number
  useTls: boolean
  allowSelfSignedCert: boolean
  rpcPath: string
  username: string
  hasPassword: boolean
  sort?: SortPref
}

export interface ProfileInput {
  id?: string
  name: string
  host: string
  port: number
  useTls: boolean
  allowSelfSignedCert: boolean
  rpcPath: string
  username: string
  /** New password to store; undefined = keep existing, empty string = clear */
  password?: string
}

export type RpcErrorKind = 'network' | 'timeout' | 'auth' | 'tls' | 'http' | 'rpc' | 'unknown'

export interface RpcError {
  kind: RpcErrorKind
  message: string
  status?: number
}

export type RpcResult<T = unknown> = { ok: true; data: T } | { ok: false; error: RpcError }

export interface RpcRequest {
  profileId: string
  method: string
  arguments?: Record<string, unknown>
}

export interface AppPrefs {
  theme: 'system' | 'light' | 'dark'
  pollingIntervalMs: number
}

export interface TorrentFilePayload {
  name: string
  base64: string
}

export interface Api {
  rpc: <T = unknown>(req: RpcRequest) => Promise<RpcResult<T>>
  testConnection: (input: ProfileInput) => Promise<RpcResult<{ version: string }>>
  profiles: {
    list: () => Promise<ServerProfile[]>
    save: (input: ProfileInput) => Promise<ServerProfile>
    remove: (id: string) => Promise<void>
    getActiveId: () => Promise<string | null>
    setActiveId: (id: string | null) => Promise<void>
    setSort: (id: string, sort: SortPref) => Promise<void>
  }
  prefs: {
    get: () => Promise<AppPrefs>
    set: (prefs: Partial<AppPrefs>) => Promise<AppPrefs>
  }
  pickTorrentFiles: () => Promise<TorrentFilePayload[]>
  readDroppedTorrents: (paths: string[]) => Promise<TorrentFilePayload[]>
  onOpenMagnet: (cb: (url: string) => void) => () => void
  onOpenTorrentFiles: (cb: (files: TorrentFilePayload[]) => void) => () => void
}
