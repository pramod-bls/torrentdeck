/**
 * Workspace state: which panels are on the grid and where. The persisted copy
 * lives in electron-store keyed by profile id; this slice holds the active
 * profile's layout. Persistence is a listener-middleware side effect (see
 * persistWorkspaceMiddleware) so reducers stay pure — the pattern carried
 * over from the reference implementation in ADR-0002.
 */
import {
  createAsyncThunk,
  createListenerMiddleware,
  createSlice,
  isAnyOf,
  type PayloadAction
} from '@reduxjs/toolkit'
import type { PanelTypeId, WorkspaceItem, WorkspaceLayout } from '@shared/types'
import { defaultLayout, normalizeLayout, placeNewItem } from './panels'

export interface WorkspaceState {
  /** Layout being shown; null until the first loadWorkspace resolves */
  layout: WorkspaceLayout | null
  /** Which profile `layout` belongs to — guards against late async loads */
  profileId: string | null
}

const initialState: WorkspaceState = { layout: null, profileId: null }

export const loadWorkspace = createAsyncThunk(
  'workspace/load',
  async (profileId: string): Promise<{ profileId: string; layout: WorkspaceLayout }> => {
    const stored = await window.api.workspace.get(profileId)
    return { profileId, layout: normalizeLayout(stored) ?? defaultLayout() }
  }
)

/** Positions from react-grid-layout keyed by item id (x/y/w/h only). */
export type GridPositions = Record<string, { x: number; y: number; w: number; h: number }>

const workspaceSlice = createSlice({
  name: 'workspace',
  initialState,
  reducers: {
    gridChanged(state, action: PayloadAction<GridPositions>) {
      if (!state.layout) return
      state.layout.items = state.layout.items.map((it) => {
        const pos = action.payload[it.i]
        return pos ? { ...it, ...pos } : it
      })
    },
    panelAdded(state, action: PayloadAction<PanelTypeId>) {
      if (!state.layout) return
      state.layout.items.push(placeNewItem(action.payload, state.layout.items))
    },
    panelRemoved(state, action: PayloadAction<string>) {
      if (!state.layout) return
      state.layout.items = state.layout.items.filter((it) => it.i !== action.payload)
    },
    layoutReset(state) {
      state.layout = defaultLayout()
    }
  },
  extraReducers: (builder) => {
    builder.addCase(loadWorkspace.fulfilled, (state, action) => {
      state.layout = action.payload.layout
      state.profileId = action.payload.profileId
    })
  }
})

export const { gridChanged, panelAdded, panelRemoved, layoutReset } = workspaceSlice.actions
export default workspaceSlice.reducer

export function selectPanelInstances(items: WorkspaceItem[] | undefined): Set<PanelTypeId> {
  return new Set((items ?? []).map((it) => it.type))
}

/**
 * Write-through persistence: any user mutation of the layout saves it for the
 * profile it belongs to. loadWorkspace deliberately does NOT trigger a save.
 */
export const persistWorkspaceMiddleware = createListenerMiddleware()
persistWorkspaceMiddleware.startListening({
  matcher: isAnyOf(gridChanged, panelAdded, panelRemoved, layoutReset),
  effect: async (_action, api) => {
    const state = api.getState() as { workspace: WorkspaceState }
    const { layout, profileId } = state.workspace
    if (layout && profileId) await window.api.workspace.set(profileId, layout)
  }
})
