import { useEffect, useMemo, useState } from 'react'
import { useAppDispatch, useAppSelector, useActiveProfileId } from '@/app/hooks'
import { closeAddTorrent } from '@/features/ui/uiSlice'
import { useAddTorrentMutation, useFreeSpaceQuery, useGetSessionQuery } from '@/services/rpcApi'
import { parseTorrentPreview } from '@/lib/bencode'
import { formatBytes } from '@/lib/format'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input, Field } from '@/components/ui/input'
import { Checkbox, LabeledCheckbox } from '@/components/ui/checkbox'

export function AddTorrentDialog(): React.JSX.Element | null {
  const dispatch = useAppDispatch()
  const payload = useAppSelector((s) => s.ui.addTorrent)
  const profileId = useActiveProfileId()
  const { data: session } = useGetSessionQuery(profileId ? { profileId } : { profileId: '' }, {
    skip: !profileId
  })
  const [addTorrent, { isLoading: adding }] = useAddTorrentMutation()

  const [magnet, setMagnet] = useState('')
  const [dir, setDir] = useState('')
  const [labels, setLabels] = useState('')
  const [paused, setPaused] = useState(false)
  const [unwanted, setUnwanted] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)

  const open = payload !== null
  const files = payload?.files ?? []
  const isMagnetMode = payload?.magnet !== undefined

  const preview = useMemo(
    () => (files.length === 1 ? parseTorrentPreview(files[0].base64) : null),
    [files]
  )

  useEffect(() => {
    if (open) {
      setMagnet(payload?.magnet ?? '')
      setDir(session?.['download-dir'] ?? '')
      setLabels('')
      setPaused(false)
      setUnwanted(new Set())
      setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, payload])

  useEffect(() => {
    if (open && !dir && session) setDir(session['download-dir'])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, open])

  const { data: freeSpace } = useFreeSpaceQuery(
    { profileId: profileId ?? '', path: dir },
    { skip: !profileId || !dir || !open }
  )

  if (!open || !profileId) return null

  const close = (): void => {
    dispatch(closeAddTorrent())
  }

  const submit = async (): Promise<void> => {
    setError(null)
    const labelList = labels
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const common = {
      profileId,
      downloadDir: dir || undefined,
      paused,
      labels: labelList.length ? labelList : undefined
    }
    try {
      if (isMagnetMode) {
        if (!magnet.trim().startsWith('magnet:')) {
          setError('Enter a magnet link starting with magnet:')
          return
        }
        const res = await addTorrent({ ...common, magnet: magnet.trim() }).unwrap()
        if (res['torrent-duplicate']) setError('That torrent is already on the server')
        else close()
      } else {
        for (const f of files) {
          await addTorrent({
            ...common,
            metainfoBase64: f.base64,
            unwantedIndices: files.length === 1 ? [...unwanted] : undefined
          }).unwrap()
        }
        close()
      }
    } catch (e) {
      setError((e as { message?: string })?.message ?? 'Adding the torrent failed')
    }
  }

  const toggleUnwanted = (index: number, wanted: boolean): void => {
    const next = new Set(unwanted)
    if (wanted) next.delete(index)
    else next.add(index)
    setUnwanted(next)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent title="Add torrent" wide={!!preview}>
        <div className="space-y-3">
          {isMagnetMode ? (
            <Field label="Magnet link">
              <Input
                value={magnet}
                onChange={(e) => setMagnet(e.target.value)}
                placeholder="magnet:?xt=urn:btih:…"
                autoFocus
              />
            </Field>
          ) : (
            <div className="text-sm">
              {files.length === 1 ? (
                <p className="break-all">{preview?.name ?? files[0].name}</p>
              ) : (
                <ul className="max-h-24 list-inside list-disc overflow-y-auto text-xs">
                  {files.map((f) => (
                    <li key={f.name}>{f.name}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <Field label="Destination folder">
            <Input value={dir} onChange={(e) => setDir(e.target.value)} />
          </Field>
          {freeSpace && freeSpace['size-bytes'] >= 0 && (
            <p className="text-xs text-surface-500">
              Free space: {formatBytes(freeSpace['size-bytes'])}
            </p>
          )}

          {preview && preview.files.length > 1 && (
            <div className="max-h-52 overflow-y-auto rounded border border-surface-200 dark:border-surface-700">
              {preview.files.map((f, i) => (
                <div
                  key={f.path}
                  className="flex items-center gap-2 border-b border-surface-100 px-2 py-1.5 last:border-b-0 dark:border-surface-800"
                >
                  <Checkbox
                    checked={!unwanted.has(i)}
                    onCheckedChange={(v) => toggleUnwanted(i, v)}
                    aria-label={`Download ${f.path}`}
                  />
                  <span className="min-w-0 flex-1 truncate text-xs" title={f.path}>
                    {f.path}
                  </span>
                  <span className="shrink-0 text-[11px] text-surface-500">{formatBytes(f.length)}</span>
                </div>
              ))}
            </div>
          )}

          <Field label="Labels (comma separated, optional)">
            <Input value={labels} onChange={(e) => setLabels(e.target.value)} placeholder="isos, linux" />
          </Field>

          <LabeledCheckbox checked={paused} onCheckedChange={setPaused} label="Add paused" />

          {error && <p className="text-xs text-danger-600 dark:text-danger-400">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button onClick={() => void submit()} disabled={adding || (isMagnetMode && !magnet.trim())}>
              {adding ? 'Adding…' : 'Add torrent'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
