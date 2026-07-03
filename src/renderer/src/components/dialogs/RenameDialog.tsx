import { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { closeRename } from '@/features/ui/uiSlice'
import { useRenamePathMutation } from '@/services/rpcApi'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input, Field } from '@/components/ui/input'

/**
 * Renames a path INSIDE a torrent on the daemon via torrent-rename-path —
 * the torrent root (its display name + folder) or any individual file.
 * Verification data stays valid; the daemon rejects collisions, which we
 * surface inline.
 */
export function RenameDialog(): React.JSX.Element | null {
  const dispatch = useAppDispatch()
  const target = useAppSelector((s) => s.ui.renameTarget)
  const [renamePath, { isLoading }] = useRenamePathMutation()
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)

  const open = target !== null
  useEffect(() => {
    if (open && target) {
      setDraft(target.currentName)
      setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null

  const close = (): void => {
    dispatch(closeRename())
  }

  const name = draft.trim()
  const valid = name.length > 0 && name !== target.currentName && !name.includes('/')

  const save = async (): Promise<void> => {
    setError(null)
    try {
      await renamePath({
        profileId: target.profileId,
        id: target.id,
        path: target.path,
        name
      }).unwrap()
      close()
    } catch (e) {
      setError((e as { message?: string })?.message ?? 'Rename failed')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent title="Rename">
        <div className="space-y-3">
          <p className="text-xs break-all text-surface-500 dark:text-surface-400">
            {target.path}
          </p>
          <Field label="New name">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && valid && void save()}
            />
          </Field>
          {draft.includes('/') && (
            <p className="text-xs text-danger-600 dark:text-danger-400">
              Names can't contain "/"
            </p>
          )}
          {error && <p className="text-xs text-danger-600 dark:text-danger-400">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button onClick={() => void save()} disabled={!valid || isLoading}>
              {isLoading ? 'Renaming…' : 'Rename'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
