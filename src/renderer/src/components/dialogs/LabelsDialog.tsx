import { useEffect, useMemo, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { closeLabelsEditor } from '@/features/ui/uiSlice'
import { rpcApi, useSetTorrentMutation } from '@/services/rpcApi'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input, Field } from '@/components/ui/input'

/**
 * Bulk label editor for the current selection. Prefills with the labels of
 * the first selected torrent (read from the RTK Query cache) and REPLACES
 * labels on all selected torrents on save — Transmission's `torrent-set
 * labels` has replace semantics, so that's what we expose.
 */
export function LabelsDialog(): React.JSX.Element | null {
  const dispatch = useAppDispatch()
  const target = useAppSelector((s) => s.ui.labelsEditor)
  const cached = useAppSelector((s) =>
    target ? rpcApi.endpoints.getTorrents.select({ profileId: target.profileId })(s).data : undefined
  )
  const [setTorrent, { isLoading }] = useSetTorrentMutation()
  const [draft, setDraft] = useState('')

  const open = target !== null
  const initial = useMemo(() => {
    if (!target || !cached) return ''
    const first = cached.find((t) => t.id === target.ids[0])
    return first?.labels.join(', ') ?? ''
  }, [target, cached])

  useEffect(() => {
    if (open) setDraft(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null

  const close = (): void => {
    dispatch(closeLabelsEditor())
  }

  const save = async (): Promise<void> => {
    const labels = draft
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    await setTorrent({ profileId: target.profileId, ids: target.ids, fields: { labels } })
    close()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent
        title={target.ids.length === 1 ? 'Set labels' : `Set labels on ${target.ids.length} torrents`}
      >
        <div className="space-y-3">
          <Field label="Labels (comma separated — replaces existing labels)">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="isos, linux"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && void save()}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button onClick={() => void save()} disabled={isLoading}>
              Apply
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
