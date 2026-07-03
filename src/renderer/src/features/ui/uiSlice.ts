/**
 * Ephemeral view state: selection, detail target, panel focus, and open
 * dialogs. Filters/sort/search moved into each Torrents panel's persisted
 * config in v0.3 (see TorrentsPanelConfig) — they no longer live here.
 *
 * Selection is server-qualified (ADR-0003): torrent ids are only unique per
 * daemon, so selection always carries the profileId it belongs to, and
 * multi-select never spans servers (every bulk action stays a single RPC).
 *
 * Dialog-state conventions: `addTorrent` null = closed; `profileEditorId`
 * undefined = closed, null = "create new", string = edit that profile;
 * `removeConfirm`/`labelsEditor` null = closed.
 */
import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { TorrentFilePayload } from '@shared/types'

export interface Selection {
  profileId: string
  ids: number[]
}

export interface AddTorrentPayload {
  magnet?: string
  files?: TorrentFilePayload[]
}

export interface RenameTarget {
  profileId: string
  id: number
  /** Full path within the torrent of the thing being renamed */
  path: string
  /** Its current basename (prefill) */
  currentName: string
}

export interface UiState {
  selection: Selection | null
  detailTarget: { profileId: string; id: number } | null
  focusedPanelId: string | null
  detailTab: 'general' | 'files' | 'peers' | 'trackers' | 'pieces'
  addTorrent: AddTorrentPayload | null
  profileEditorId: string | null | undefined
  removeConfirm: Selection | null
  labelsEditor: Selection | null
  renameTarget: RenameTarget | null
  queueEditor: { profileId: string; id: number; current: number; name: string } | null
  sessionSettingsOpen: boolean
  prefsOpen: boolean
  shortcutsOpen: boolean
  groupsOpen: boolean
}

const initialState: UiState = {
  selection: null,
  detailTarget: null,
  focusedPanelId: null,
  detailTab: 'general',
  addTorrent: null,
  profileEditorId: undefined,
  removeConfirm: null,
  labelsEditor: null,
  renameTarget: null,
  queueEditor: null,
  sessionSettingsOpen: false,
  prefsOpen: false,
  shortcutsOpen: false,
  groupsOpen: false
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    selectTorrent(
      state,
      action: PayloadAction<{ profileId: string; id: number; additive: boolean }>
    ) {
      const { profileId, id, additive } = action.payload
      const sameServer = state.selection?.profileId === profileId
      if (additive && sameServer && state.selection) {
        state.selection.ids = state.selection.ids.includes(id)
          ? state.selection.ids.filter((x) => x !== id)
          : [...state.selection.ids, id]
        if (state.selection.ids.length === 0) state.selection = null
      } else {
        state.selection = { profileId, ids: [id] }
      }
      state.detailTarget = state.selection?.ids.includes(id) ? { profileId, id } : null
    },
    selectMany(state, action: PayloadAction<Selection>) {
      const { profileId, ids } = action.payload
      state.selection = ids.length ? { profileId, ids } : null
      state.detailTarget = ids.length ? { profileId, id: ids[ids.length - 1] } : null
    },
    clearSelection(state) {
      state.selection = null
      state.detailTarget = null
    },
    setFocusedPanel(state, action: PayloadAction<string | null>) {
      state.focusedPanelId = action.payload
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
    openRemoveConfirm(state, action: PayloadAction<Selection>) {
      state.removeConfirm = action.payload
    },
    closeRemoveConfirm(state) {
      state.removeConfirm = null
    },
    openLabelsEditor(state, action: PayloadAction<Selection>) {
      state.labelsEditor = action.payload
    },
    closeLabelsEditor(state) {
      state.labelsEditor = null
    },
    openRename(state, action: PayloadAction<RenameTarget>) {
      state.renameTarget = action.payload
    },
    closeRename(state) {
      state.renameTarget = null
    },
    openQueueEditor(
      state,
      action: PayloadAction<{ profileId: string; id: number; current: number; name: string }>
    ) {
      state.queueEditor = action.payload
    },
    closeQueueEditor(state) {
      state.queueEditor = null
    },
    setSessionSettingsOpen(state, action: PayloadAction<boolean>) {
      state.sessionSettingsOpen = action.payload
    },
    setPrefsOpen(state, action: PayloadAction<boolean>) {
      state.prefsOpen = action.payload
    },
    setShortcutsOpen(state, action: PayloadAction<boolean>) {
      state.shortcutsOpen = action.payload
    },
    setGroupsOpen(state, action: PayloadAction<boolean>) {
      state.groupsOpen = action.payload
    }
  }
})

export const {
  selectTorrent,
  selectMany,
  clearSelection,
  setFocusedPanel,
  setDetailTab,
  openAddTorrent,
  closeAddTorrent,
  openProfileEditor,
  closeProfileEditor,
  openRemoveConfirm,
  closeRemoveConfirm,
  openLabelsEditor,
  closeLabelsEditor,
  openRename,
  closeRename,
  openQueueEditor,
  closeQueueEditor,
  setSessionSettingsOpen,
  setPrefsOpen,
  setShortcutsOpen,
  setGroupsOpen
} = uiSlice.actions
export default uiSlice.reducer
