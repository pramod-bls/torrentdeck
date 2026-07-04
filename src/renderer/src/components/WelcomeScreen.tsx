import { Plus } from 'lucide-react'
import { useAppDispatch } from '@/app/hooks'
import { openProfileEditor } from '@/features/ui/uiSlice'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/Logo'

/** Shown only when no servers are configured yet. */
export function WelcomeScreen(): React.JSX.Element {
  const dispatch = useAppDispatch()

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <Logo size={72} className="drop-shadow-sm" />
      <div className="text-center">
        <h1 className="text-2xl font-light tracking-wide text-surface-900 dark:text-white">
          Torrent<span className="font-normal text-brand-500 dark:text-brand-400">Deck</span>
        </h1>
        <p className="mt-1 text-sm text-surface-500">
          Add a Transmission, Deluge, or qBittorrent server to get started.
        </p>
      </div>
      <Button onClick={() => dispatch(openProfileEditor(null))}>
        <Plus size={14} /> Add server
      </Button>
    </div>
  )
}
