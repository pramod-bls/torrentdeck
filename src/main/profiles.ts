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
import type { AppPrefs, ProfileInput, ServerProfile, SortPref } from '@shared/types'

interface StoreSchema {
  profiles: ServerProfile[]
  /** profile id -> safeStorage-encrypted password, base64 */
  passwords: Record<string, string>
  activeProfileId: string | null
  prefs: AppPrefs
}

const store = new Store<StoreSchema>({
  defaults: {
    profiles: [],
    passwords: {},
    activeProfileId: null,
    prefs: { theme: 'system', pollingIntervalMs: 3000 }
  }
})

export function listProfiles(): ServerProfile[] {
  return store.get('profiles')
}

export function getProfile(id: string): ServerProfile | undefined {
  return store.get('profiles').find((p) => p.id === id)
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

  const profile: ServerProfile = {
    id,
    name: input.name,
    host: input.host,
    port: input.port,
    useTls: input.useTls,
    allowSelfSignedCert: input.allowSelfSignedCert,
    rpcPath: input.rpcPath || '/transmission/rpc',
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
  if (store.get('activeProfileId') === id) store.set('activeProfileId', null)
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

export function getActiveProfileId(): string | null {
  return store.get('activeProfileId')
}

export function setActiveProfileId(id: string | null): void {
  store.set('activeProfileId', id)
}

export function setProfileSort(id: string, sort: SortPref): void {
  store.set(
    'profiles',
    store.get('profiles').map((p) => (p.id === id ? { ...p, sort } : p))
  )
}

export function getPrefs(): AppPrefs {
  return store.get('prefs')
}

export function setPrefs(partial: Partial<AppPrefs>): AppPrefs {
  const next = { ...store.get('prefs'), ...partial }
  store.set('prefs', next)
  return next
}
