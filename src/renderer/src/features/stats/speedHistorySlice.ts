/**
 * Rolling speed history per server, feeding the Speed Graph panel. Samples
 * are captured as a side effect of session-stats polls (whoever polls —
 * StatusBar, StatsPanel, or a graph panel itself — feeds the buffer), so the
 * graph costs no additional RPC traffic. Ring-buffered to ~45 min at the
 * default 3 s poll.
 */
import { createListenerMiddleware, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { rpcApi } from '@/services/rpcApi'

export interface SpeedSample {
  t: number
  down: number
  up: number
}

const MAX_SAMPLES = 900

type SpeedHistoryState = Record<string, SpeedSample[]>

const speedHistorySlice = createSlice({
  name: 'speedHistory',
  initialState: {} as SpeedHistoryState,
  reducers: {
    sampleAdded(state, action: PayloadAction<{ profileId: string; sample: SpeedSample }>) {
      const { profileId, sample } = action.payload
      const buf = state[profileId] ?? (state[profileId] = [])
      buf.push(sample)
      if (buf.length > MAX_SAMPLES) buf.splice(0, buf.length - MAX_SAMPLES)
    }
  }
})

export const { sampleAdded } = speedHistorySlice.actions
export default speedHistorySlice.reducer

export const speedSamplerMiddleware = createListenerMiddleware()
speedSamplerMiddleware.startListening({
  matcher: rpcApi.endpoints.getSessionStats.matchFulfilled,
  effect: (action, api) => {
    const profileId = action.meta.arg.originalArgs.profileId
    api.dispatch(
      sampleAdded({
        profileId,
        sample: {
          t: Date.now(),
          down: action.payload.downloadSpeed,
          up: action.payload.uploadSpeed
        }
      })
    )
  }
})
