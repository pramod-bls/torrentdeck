import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { AppPrefs, ProfileInput, ServerProfile } from '@shared/types'
import { rpcApi } from '@/services/rpcApi'

export interface ConnectionState {
  loaded: boolean
  profiles: ServerProfile[]
  activeProfileId: string | null
  prefs: AppPrefs
}

const initialState: ConnectionState = {
  loaded: false,
  profiles: [],
  activeProfileId: null,
  prefs: { theme: 'system', pollingIntervalMs: 3000 }
}

export const bootstrap = createAsyncThunk('connection/bootstrap', async () => {
  const [profiles, activeProfileId, prefs] = await Promise.all([
    window.api.profiles.list(),
    window.api.profiles.getActiveId(),
    window.api.prefs.get()
  ])
  return { profiles, activeProfileId, prefs }
})

export const saveProfile = createAsyncThunk('connection/saveProfile', async (input: ProfileInput) => {
  return window.api.profiles.save(input)
})

export const deleteProfile = createAsyncThunk('connection/deleteProfile', async (id: string) => {
  await window.api.profiles.remove(id)
  return id
})

export const setActiveProfile = createAsyncThunk(
  'connection/setActiveProfile',
  async (id: string | null, { dispatch }) => {
    await window.api.profiles.setActiveId(id)
    // A different daemon's data must never bleed into the new server's view
    dispatch(rpcApi.util.resetApiState())
    return id
  }
)

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
        state.activeProfileId = action.payload.activeProfileId
        state.prefs = action.payload.prefs
      })
      .addCase(saveProfile.fulfilled, (state, action) => {
        const saved = action.payload
        const idx = state.profiles.findIndex((p) => p.id === saved.id)
        if (idx >= 0) state.profiles[idx] = saved
        else state.profiles.push(saved)
        if (!state.activeProfileId) state.activeProfileId = saved.id
      })
      .addCase(deleteProfile.fulfilled, (state, action) => {
        state.profiles = state.profiles.filter((p) => p.id !== action.payload)
        if (state.activeProfileId === action.payload) state.activeProfileId = null
      })
      .addCase(setActiveProfile.fulfilled, (state, action) => {
        state.activeProfileId = action.payload
      })
      .addCase(savePrefs.fulfilled, (state, action) => {
        state.prefs = action.payload
      })
  }
})

export const { profileSortSaved } = connectionSlice.actions
export default connectionSlice.reducer
