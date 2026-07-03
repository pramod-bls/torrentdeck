import { GripHorizontal, X } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { panelRemoved } from '@/features/workspace/workspaceSlice'
import { setFocusedPanel } from '@/features/ui/uiSlice'
import { cn } from '@/lib/cn'

/**
 * The frame every workspace panel lives in: a header that doubles as the
 * react-grid-layout drag handle (`.panel-drag-handle` — referenced by
 * dragConfig.handle in Workspace.tsx) with the panel title and a remove
 * button, and a clipped content area the panel fills. Clicking anywhere in a
 * panel focuses it (ring + keyboard routing target).
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
  const focused = useAppSelector((s) => s.ui.focusedPanelId === id)
  return (
    <div
      data-panel-id={id}
      onMouseDownCapture={() => dispatch(setFocusedPanel(id))}
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-lg border bg-surface-50 dark:bg-surface-900',
        focused
          ? 'border-accent-400 ring-1 ring-accent-400/40 dark:border-accent-500'
          : 'border-surface-200 dark:border-surface-700'
      )}
    >
      <div className="panel-drag-handle flex shrink-0 cursor-grab items-center gap-1.5 border-b border-surface-200 bg-surface-50 px-2 py-1 select-none active:cursor-grabbing dark:border-surface-700 dark:bg-surface-800/60">
        <GripHorizontal size={12} className="text-surface-400" />
        <span className="text-xs font-medium text-surface-600 dark:text-surface-300">{title}</span>
        <span className="flex-1" />
        <button
          type="button"
          aria-label={`Remove ${title} panel`}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => dispatch(panelRemoved(id))}
          className="rounded p-0.5 text-surface-400 hover:bg-surface-200 hover:text-surface-700 dark:hover:bg-surface-700 dark:hover:text-surface-200"
        >
          <X size={12} />
        </button>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  )
}
