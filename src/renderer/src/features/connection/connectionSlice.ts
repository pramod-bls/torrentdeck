/**
 * Mirrors main-process state (profiles, app prefs) into Redux. electron-store
 * in the main process is the source of truth; every mutation here is a thunk
 * that writes through `window.api` first and only updates the slice from the
 * confirmed result.
 */
import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { AppPrefs, ProfileInput, ServerProfile } from '@shared/types'
import { setServerColorOverride, setServerColorOverrides } from './serverColor'

export interface ConnectionState {
  loaded: boolean
  profiles: ServerProfile[]
  prefs: AppPrefs
}

const initialState: ConnectionState = {
  loaded: false,
  profiles: [],
  prefs: {
    theme: 'system',
    pollingIntervalMs: 3000,
    notifyOnComplete: true,
    closeToTray: false,
    askedTorrentDefault: false,
    watchClipboardMagnets: false
  }
}

export const bootstrap = createAsyncThunk('connection/bootstrap', async () => {
  const [profiles, prefs] = await Promise.all([window.api.profiles.list(), window.api.prefs.get()])
  return { profiles, prefs }
})

export const saveProfile = createAsyncThunk('connection/saveProfile', async (input: ProfileInput) => {
  return window.api.profiles.save(input)
})

export const deleteProfile = createAsyncThunk('connection/deleteProfile', async (id: string) => {
  await window.api.profiles.remove(id)
  return id
})

export const savePrefs = createAsyncThunk('connection/savePrefs', async (partial: Partial<AppPrefs>) => {
  return window.api.prefs.set(partial)
})

const connectionSlice = createSlice({
  name: 'connection',
  initialState,
  reducers: {
    profileSortSaved(state, action: PayloadAction<{ id: string; sort: ServerProfile['sort'] }>) {
      const p = state.profiles.find((x) => x.id === action.payload.id)
      if (p) p.sort = action.payload.sort
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(bootstrap.fulfilled, (state, action) => {
        state.loaded = true
        state.profiles = action.payload.profiles
        state.prefs = action.payload.prefs
        setServerColorOverrides(action.payload.profiles)
      })
      .addCase(saveProfile.fulfilled, (state, action) => {
        const saved = action.payload
        const idx = state.profiles.findIndex((p) => p.id === saved.id)
        if (idx >= 0) state.profiles[idx] = saved
        else state.profiles.push(saved)
        setServerColorOverride(saved.id, saved.color)
      })
      .addCase(deleteProfile.fulfilled, (state, action) => {
        state.profiles = state.profiles.filter((p) => p.id !== action.payload)
        setServerColorOverride(action.payload, undefined)
      })
      .addCase(savePrefs.fulfilled, (state, action) => {
        state.prefs = action.payload
      })
  }
})

export const { profileSortSaved } = connectionSlice.actions
export default connectionSlice.reducer
