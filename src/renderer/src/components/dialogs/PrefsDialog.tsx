import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { savePrefs } from '@/features/connection/connectionSlice'
import { setPrefsOpen } from '@/features/ui/uiSlice'
import type { AppPrefs } from '@shared/types'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Field } from '@/components/ui/input'

export function PrefsDialog(): React.JSX.Element | null {
  const dispatch = useAppDispatch()
  const open = useAppSelector((s) => s.ui.prefsOpen)
  const prefs = useAppSelector((s) => s.connection.prefs)

  if (!open) return null

  const close = (): void => {
    dispatch(setPrefsOpen(false))
  }
  const update = (partial: Partial<AppPrefs>): void => {
    void dispatch(savePrefs(partial))
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent title="Preferences">
        <div className="space-y-3">
          <Field label="Theme">
            <select
              value={prefs.theme}
              onChange={(e) => update({ theme: e.target.value as AppPrefs['theme'] })}
              className="h-8 w-full rounded-md border border-surface-300 bg-surface-50 px-2 text-sm dark:border-surface-600 dark:bg-surface-800"
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </Field>
          <Field label="Refresh interval">
            <select
              value={prefs.pollingIntervalMs}
              onChange={(e) => update({ pollingIntervalMs: Number(e.target.value) })}
              className="h-8 w-full rounded-md border border-surface-300 bg-surface-50 px-2 text-sm dark:border-surface-600 dark:bg-surface-800"
            >
              <option value={1000}>1 second</option>
              <option value={3000}>3 seconds</option>
              <option value={5000}>5 seconds</option>
              <option value={10000}>10 seconds</option>
            </select>
          </Field>
        </div>
      </DialogContent>
    </Dialog>
  )
}
