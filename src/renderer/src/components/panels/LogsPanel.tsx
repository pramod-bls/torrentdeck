import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Copy, FolderOpen, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * In-app viewer for the main-process log file (tail of `main.log`), as a
 * workspace panel. The text is selectable (overriding the app-wide
 * user-select:none) and there's a Copy button, so a log can be shared easily.
 */
export function LogsPanel(): React.JSX.Element {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const preRef = useRef<HTMLPreElement>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    const t = await window.api.logs.read()
    setText(t || '(log is empty)')
    setLoading(false)
    requestAnimationFrame(() => {
      if (preRef.current) preRef.current.scrollTop = preRef.current.scrollHeight
    })
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard denied — the text is still selectable by hand
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b border-surface-200 px-2 py-1 dark:border-surface-700">
        <Button variant="ghost" size="sm" onClick={() => void refresh()} disabled={loading}>
          <RefreshCw size={12} /> Refresh
        </Button>
        <Button variant="ghost" size="sm" onClick={() => void copy()}>
          {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied' : 'Copy'}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => void window.api.logs.reveal()}>
          <FolderOpen size={12} /> Open file
        </Button>
      </div>
      <pre
        ref={preRef}
        className="flex-1 overflow-auto p-2 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-surface-700 select-text dark:text-surface-300"
      >
        {text}
      </pre>
    </div>
  )
}
