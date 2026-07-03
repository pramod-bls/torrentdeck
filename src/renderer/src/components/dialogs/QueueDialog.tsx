import { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { closeQueueEditor } from '@/features/ui/uiSlice'
import { useSetTorrentMutation } from '@/services/rpcApi'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input, Field } from '@/components/ui/input'

/**
 * Set a torrent's exact queue rank. UI is 1-based; Transmission's
 * queuePosition is 0-based, and the daemon shifts the other torrents to make
 * room, so we just write the requested slot.
 */
export function QueueDialog(): React.JSX.Element | null {
  const dispatch = useAppDispatch()
  const target = useAppSelector((s) => s.ui.queueEditor)
  const [setTorrent, { isLoading }] = useSetTorrentMutation()
  const [value, setValue] = useState('')

  const open = target !== null
  useEffect(() => {
    if (open && target) setValue(String(target.current + 1))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null

  const close = (): void => {
    dispatch(closeQueueEditor())
  }

  const save = async (): Promise<void> => {
    const n = Math.max(1, Math.floor(Number(value)))
    if (Number.isFinite(n)) {
      await setTorrent({ profileId: target.profileId, ids: [target.id], fields: { queuePosition: n - 1 } })
    }
    close()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent title="Set queue position">
        <div className="space-y-3">
          <p className="truncate text-xs text-surface-500 dark:text-surface-400" title={target.name}>
            {target.name}
          </p>
          <Field label="Queue position">
            <Input
              type="number"
              min={1}
              value={value}
              autoFocus
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void save()}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button onClick={() => void save()} disabled={isLoading || value.trim() === ''}>
              Move
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
