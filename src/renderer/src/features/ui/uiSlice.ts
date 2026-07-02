/**
 * Ephemeral view state: filters, search, sort, selection, detail-panel state,
 * and which dialog is open. Nothing here persists across restarts except
 * sort, which components write through to the profile (profiles:setSort) —
 * see Toolbar.pickSort and the restore effect in App.tsx.
 *
 * Dialog-state conventions: `addTorrent` null = closed; `profileEditorId`
 * undefined = closed, null = "create new", string = edit that profile;
 * `removeConfirmIds` null = closed.
 */
import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { SortPref } from '@shared/types'
import type { TorrentFilePayload } from '@shared/types'

export type StatusFilter = 'all' | 'downloading' | 'seeding' | 'paused' | 'checking' | 'error'

export interface AddTorrentPayload {
  magnet?: string
  files?: TorrentFilePayload[]
}

export interface UiState {
  search: string
  statusFilter: StatusFilter
  trackerFilter: string | null
  labelFilter: string | null
  sort: SortPref
  selectedIds: number[]
  detailId: number | null
  detailCollapsed: boolean
  detailTab: 'general' | 'files' | 'peers' | 'trackers'
  addTorrent: AddTorrentPayload | null
  profileEditorId: string | null | undefined
  removeConfirmIds: number[] | null
  sessionSettingsOpen: boolean
  prefsOpen: boolean
}

const initialState: UiState = {
  search: '',
  statusFilter: 'all',
  trackerFilter: null,
  labelFilter: null,
  sort: { key: 'addedDate', desc: true },
  selectedIds: [],
  detailId: null,
  detailCollapsed: false,
  detailTab: 'general',
  addTorrent: null,
  profileEditorId: undefined,
  removeConfirmIds: null,
  sessionSettingsOpen: false,
  prefsOpen: false
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setSearch(state, action: PayloadAction<string>) {
      state.search = action.payload
    },
    setStatusFilter(state, action: PayloadAction<StatusFilter>) {
      state.statusFilter = action.payload
    },
    setTrackerFilter(state, action: PayloadAction<string | null>) {
      state.trackerFilter = action.payload
    },
    setLabelFilter(state, action: PayloadAction<string | null>) {
      state.labelFilter = action.payload
    },
    setSort(state, action: PayloadAction<SortPref>) {
      state.sort = action.payload
    },
    selectTorrent(state, action: PayloadAction<{ id: number; additive: boolean }>) {
      const { id, additive } = action.payload
      if (additive) {
        state.selectedIds = state.selectedIds.includes(id)
          ? state.selectedIds.filter((x) => x !== id)
          : [...state.selectedIds, id]
      } else {
        state.selectedIds = [id]
      }
      state.detailId = state.selectedIds.length ? state.selectedIds[state.selectedIds.length - 1] : null
    },
    selectMany(state, action: PayloadAction<number[]>) {
      state.selectedIds = action.payload
      state.detailId = action.payload.length ? action.payload[action.payload.length - 1] : null
    },
    clearSelection(state) {
      state.selectedIds = []
      state.detailId = null
    },
    toggleDetailCollapsed(state) {
      state.detailCollapsed = !state.detailCollapsed
    },
    setDetailTab(state, action: PayloadAction<UiState['detailTab']>) {
      state.detailTab = action.payload
    },
    openAddTorrent(state, action: PayloadAction<AddTorrentPayload>) {
      state.addTorrent = action.payload
    },
    closeAddTorrent(state) {
      state.addTorrent = null
    },
    openProfileEditor(state, action: PayloadAction<string | null>) {
      state.profileEditorId = action.payload
    },
    closeProfileEditor(state) {
      state.profileEditorId = undefined
    },
    openRemoveConfirm(state, action: PayloadAction<number[]>) {
      state.removeConfirmIds = action.payload
    },
    closeRemoveConfirm(state) {
      state.removeConfirmIds = null
    },
    setSessionSettingsOpen(state, action: PayloadAction<boolean>) {
      state.sessionSettingsOpen = action.payload
    },
    setPrefsOpen(state, action: PayloadAction<boolean>) {
      state.prefsOpen = action.payload
    }
  }
})

export const {
  setSearch,
  setStatusFilter,
  setTrackerFilter,
  setLabelFilter,
  setSort,
  selectTorrent,
  selectMany,
  clearSelection,
  toggleDetailCollapsed,
  setDetailTab,
  openAddTorrent,
  closeAddTorrent,
  openProfileEditor,
  closeProfileEditor,
  openRemoveConfirm,
  closeRemoveConfirm,
  setSessionSettingsOpen,
  setPrefsOpen
} = uiSlice.actions
export default uiSlice.reducer
