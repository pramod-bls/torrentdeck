import { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { clearSelection, closeRemoveConfirm } from '@/features/ui/uiSlice'
import { useRemoveTorrentMutation } from '@/services/rpcApi'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { LabeledCheckbox } from '@/components/ui/checkbox'

export function RemoveConfirmDialog(): React.JSX.Element | null {
  const dispatch = useAppDispatch()
  const target = useAppSelector((s) => s.ui.removeConfirm)
  const serverName = useAppSelector(
    (s) => s.connection.profiles.find((p) => p.id === target?.profileId)?.name
  )
  const [removeTorrent, { isLoading }] = useRemoveTorrentMutation()
  const [deleteData, setDeleteData] = useState(false)

  const open = target !== null
  useEffect(() => {
    if (open) setDeleteData(false)
  }, [open])

  if (!open) return null

  const close = (): void => {
    dispatch(closeRemoveConfirm())
  }

  const confirm = async (): Promise<void> => {
    await removeTorrent({ profileId: target.profileId, ids: target.ids, deleteData })
    dispatch(clearSelection())
    close()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent
        title={target.ids.length === 1 ? 'Remove torrent' : `Remove ${target.ids.length} torrents`}
      >
        <div className="space-y-3">
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            {deleteData
              ? `The torrent and its downloaded files will be deleted from ${serverName ?? 'the server'}.`
              : `The torrent will be removed from ${serverName ?? 'the server'}. Downloaded files stay on disk.`}
          </p>
          <LabeledCheckbox
            checked={deleteData}
            onCheckedChange={setDeleteData}
            label="Also delete downloaded data"
          />
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void confirm()} disabled={isLoading}>
              {deleteData ? 'Remove and delete data' : 'Remove'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
