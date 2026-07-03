import { Server, Plus } from 'lucide-react'
import { useAppDispatch } from '@/app/hooks'
import { openProfileEditor } from '@/features/ui/uiSlice'
import { Button } from '@/components/ui/button'

/** Shown only when no servers are configured yet. */
export function WelcomeScreen(): React.JSX.Element {
  const dispatch = useAppDispatch()

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <Server size={40} className="text-surface-400" />
      <div className="text-center">
        <h1 className="text-lg font-semibold">Transmission Remote</h1>
        <p className="mt-1 text-sm text-surface-500">
          Add a Transmission or Deluge server to get started.
        </p>
      </div>
      <Button onClick={() => dispatch(openProfileEditor(null))}>
        <Plus size={14} /> Add server
      </Button>
    </div>
  )
}
