import { GripHorizontal, X } from 'lucide-react'
import { useAppDispatch } from '@/app/hooks'
import { panelRemoved } from '@/features/workspace/workspaceSlice'

/**
 * The frame every workspace panel lives in: a header that doubles as the
 * react-grid-layout drag handle (`.panel-drag-handle` — referenced by
 * dragConfig.handle in Workspace.tsx) with the panel title and a remove
 * button, and a clipped content area the panel fills.
 */
export function PanelChrome({
  id,
  title,
  children
}: {
  id: string
  title: string
  children: React.ReactNode
}): React.JSX.Element {
  const dispatch = useAppDispatch()
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
      <div className="panel-drag-handle flex shrink-0 cursor-grab items-center gap-1.5 border-b border-neutral-200 bg-neutral-50 px-2 py-1 select-none active:cursor-grabbing dark:border-neutral-700 dark:bg-neutral-800/60">
        <GripHorizontal size={12} className="text-neutral-400" />
        <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">{title}</span>
        <span className="flex-1" />
        <button
          type="button"
          aria-label={`Remove ${title} panel`}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => dispatch(panelRemoved(id))}
          className="rounded p-0.5 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
        >
          <X size={12} />
        </button>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  )
}
