import { configureStore } from '@reduxjs/toolkit'
import { rpcApi } from '@/services/rpcApi'
import connectionReducer from '@/features/connection/connectionSlice'
import uiReducer from '@/features/ui/uiSlice'

export const store = configureStore({
  reducer: {
    [rpcApi.reducerPath]: rpcApi.reducer,
    connection: connectionReducer,
    ui: uiReducer
  },
  middleware: (getDefault) => getDefault().concat(rpcApi.middleware)
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
