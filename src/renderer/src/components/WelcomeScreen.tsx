import { Server, Plus } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { setActiveProfile } from '@/features/connection/connectionSlice'
import { openProfileEditor } from '@/features/ui/uiSlice'
import { Button } from '@/components/ui/button'

export function WelcomeScreen(): React.JSX.Element {
  const dispatch = useAppDispatch()
  const profiles = useAppSelector((s) => s.connection.profiles)

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <Server size={40} className="text-neutral-400" />
      <div className="text-center">
        <h1 className="text-lg font-semibold">Transmission Remote</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {profiles.length === 0
            ? 'Connect to a Transmission server to get started.'
            : 'Pick a server to connect to.'}
        </p>
      </div>
      {profiles.length > 0 && (
        <div className="flex flex-col gap-1">
          {profiles.map((p) => (
            <Button
              key={p.id}
              variant="secondary"
              onClick={() => void dispatch(setActiveProfile(p.id))}
            >
              <Server size={14} /> {p.name}
            </Button>
          ))}
        </div>
      )}
      <Button onClick={() => dispatch(openProfileEditor(null))}>
        <Plus size={14} /> Add server
      </Button>
    </div>
  )
}
