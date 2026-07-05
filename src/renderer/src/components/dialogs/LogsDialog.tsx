import { useCallback, useEffect, useRef, useState } from 'react'
import { FolderOpen, RefreshCw } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { setLogsOpen } from '@/features/ui/uiSlice'
import { useAppVersion } from '@/lib/useAppVersion'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

/** In-app viewer for the main-process log file (tail of `main.log`). */
export function LogsDialog(): React.JSX.Element | null {
  const dispatch = useAppDispatch()
  const open = useAppSelector((s) => s.ui.logsOpen)
  const version = useAppVersion()
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const preRef = useRef<HTMLPreElement>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    const t = await window.api.logs.read()
    setText(t || '(log is empty)')
    setLoading(false)
    // jump to the newest lines
    requestAnimationFrame(() => {
      if (preRef.current) preRef.current.scrollTop = preRef.current.scrollHeight
    })
  }, [])

  useEffect(() => {
    if (open) void refresh()
  }, [open, refresh])

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={(v) => !v && dispatch(setLogsOpen(false))}>
      <DialogContent title="Logs" wide>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-surface-500">
              TorrentDeck {version ?? '…'} — most recent log entries
            </span>
            <span className="flex-1" />
            <Button variant="secondary" size="sm" onClick={() => void refresh()} disabled={loading}>
              <RefreshCw size={13} /> {loading ? 'Loading…' : 'Refresh'}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => void window.api.logs.reveal()}>
              <FolderOpen size={13} /> Open log file
            </Button>
          </div>
          <pre
            ref={preRef}
            className="h-96 overflow-auto rounded border border-surface-200 bg-surface-50 p-2 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-surface-700 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300"
          >
            {text}
          </pre>
        </div>
      </DialogContent>
    </Dialog>
  )
}
