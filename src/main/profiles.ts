/**
 * Persistent app state: server profiles, encrypted passwords, the active
 * profile id, and app preferences — all in one electron-store JSON file
 * (passwords are never stored in plaintext: safeStorage encrypts with the OS
 * keychain and only the resulting base64 blob is written to disk).
 *
 * This module is the single writer; the renderer sees profiles only through
 * the IPC handlers in `ipc.ts`, and never receives password material.
 */
import Store from 'electron-store'
import { safeStorage } from 'electron'
import { randomUUID } from 'node:crypto'
import type { AppPrefs, ProfileInput, ServerProfile, SortPref, WorkspaceLayout } from '@shared/types'

interface StoreSchema {
  profiles: ServerProfile[]
  /** profile id -> safeStorage-encrypted password, base64 */
  passwords: Record<string, string>
  prefs: AppPrefs
  /** The single app-wide panel workspace (renderer validates). */
  workspace: WorkspaceLayout | null
  // Deprecated (read once for migration to `workspace`): per-profile layouts +
  // the old active-server pointer. No longer written.
  activeProfileId?: string | null
  workspaces?: Record<string, WorkspaceLayout>
}

const store = new Store<StoreSchema>({
  defaults: {
    profiles: [],
    passwords: {},
    prefs: { theme: 'system', pollingIntervalMs: 3000, notifyOnComplete: true, closeToTray: false },
    workspace: null
  }
})

/** Default RPC path for a server type when the user leaves the field blank. */
export function defaultRpcPath(serverType: ServerProfile['serverType']): string {
  return serverType === 'deluge' ? '/json' : '/transmission/rpc'
}

/** Backfill `serverType` for profiles saved before the field existed. */
function normalizeProfile(p: ServerProfile): ServerProfile {
  return p.serverType ? p : { ...p, serverType: 'transmission' }
}

export function listProfiles(): ServerProfile[] {
  return store.get('profiles').map(normalizeProfile)
}

export function getProfile(id: string): ServerProfile | undefined {
  const p = store.get('profiles').find((p) => p.id === id)
  return p ? normalizeProfile(p) : undefined
}

export function saveProfile(input: ProfileInput): ServerProfile {
  const profiles = store.get('profiles')
  const passwords = store.get('passwords')
  const id = input.id ?? randomUUID()
  const existing = profiles.find((p) => p.id === id)

  if (input.password !== undefined) {
    if (input.password === '') {
      delete passwords[id]
    } else {
      passwords[id] = safeStorage.encryptString(input.password).toString('base64')
    }
    store.set('passwords', passwords)
  }

  const serverType = input.serverType ?? 'transmission'
  const profile: ServerProfile = {
    id,
    name: input.name,
    serverType,
    host: input.host,
    port: input.port,
    useTls: input.useTls,
    allowSelfSignedCert: input.allowSelfSignedCert,
    rpcPath: input.rpcPath || defaultRpcPath(serverType),
    username: input.username,
    hasPassword: passwords[id] !== undefined,
    sort: existing?.sort
  }

  const next = existing ? profiles.map((p) => (p.id === id ? profile : p)) : [...profiles, profile]
  store.set('profiles', next)
  return profile
}

export function deleteProfile(id: string): void {
  store.set(
    'profiles',
    store.get('profiles').filter((p) => p.id !== id)
  )
  const passwords = store.get('passwords')
  delete passwords[id]
  store.set('passwords', passwords)
}

/** The single app-wide workspace. Migrates a pre-v0.8 per-profile layout on
 * first read (prefers the old active server's layout, else any). */
export function getWorkspace(): WorkspaceLayout | null {
  const current = store.get('workspace')
  if (current) return current
  const legacy = store.get('workspaces')
  if (legacy && Object.keys(legacy).length > 0) {
    const active = store.get('activeProfileId')
    const migrated = (active && legacy[active]) || Object.values(legacy)[0]
    if (migrated) {
      store.set('workspace', migrated)
      return migrated
    }
  }
  return null
}

export function setWorkspace(layout: WorkspaceLayout): void {
  store.set('workspace', layout)
}

export function getPassword(id: string): string | undefined {
  const enc = store.get('passwords')[id]
  if (!enc) return undefined
  try {
    return safeStorage.decryptString(Buffer.from(enc, 'base64'))
  } catch {
    return undefined
  }
}

export function setProfileSort(id: string, sort: SortPref): void {
  store.set(
    'profiles',
    store.get('profiles').map((p) => (p.id === id ? { ...p, sort } : p))
  )
}

export function getPrefs(): AppPrefs {
  // Spread over defaults so prefs added in later versions surface for
  // stores written by older builds (electron-store defaults don't deep-merge)
  const stored = store.get('prefs') as Partial<AppPrefs>
  return {
    theme: 'system',
    pollingIntervalMs: 3000,
    notifyOnComplete: true,
    closeToTray: false,
    ...stored
  }
}

export function setPrefs(partial: Partial<AppPrefs>): AppPrefs {
  const next = { ...store.get('prefs'), ...partial }
  store.set('prefs', next)
  return next
}
