import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch, RootState } from './store'

export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()

/** The first configured server, used as the fallback target where a single
 * server is needed and none was explicitly chosen (there is no "active" server). */
export function useFirstProfileId(): string | null {
  return useAppSelector((s) => s.connection.profiles[0]?.id ?? null)
}

export function usePollingInterval(): number {
  return useAppSelector((s) => s.connection.prefs.pollingIntervalMs)
}
