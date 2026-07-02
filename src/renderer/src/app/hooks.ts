import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch, RootState } from './store'

export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()

export function useActiveProfileId(): string | null {
  return useAppSelector((s) => s.connection.activeProfileId)
}

export function usePollingInterval(): number {
  return useAppSelector((s) => s.connection.prefs.pollingIntervalMs)
}
