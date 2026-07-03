import { GripHorizontal, X } from 'lucide-react'
import type { WorkspaceItem } from '@shared/types'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { panelRemoved } from '@/features/workspace/workspaceSlice'
import { panelServerIds } from '@/features/workspace/panels'
import { serverColor } from '@/features/connection/serverColor'
import { setFocusedPanel } from '@/features/ui/uiSlice'
import { cn } from '@/lib/cn'

/**
 * The frame every workspace panel lives in: a header that doubles as the
 * react-grid-layout drag handle (`.panel-drag-handle` — referenced by
 * dragConfig.handle in Workspace.tsx) with the panel title and a remove
 * button, and a clipped content area the panel fills. Clicking anywhere in a
 * panel focuses it (ring + keyboard routing target).
 *
 * A thin color strip along the top marks which server(s) the panel shows: one
 * band per server (equal segments), so multi-server Torrents panels read at a
 * glance. Colors are the stable per-server pastels (serverColor).
 */
export function PanelChrome({
  id,
  title,
  item,
  children
}: {
  id: string
  title: string
  item: WorkspaceItem
  children: React.ReactNode
}): React.JSX.Element {
  const dispatch = useAppDispatch()
  const focused = useAppSelector((s) => s.ui.focusedPanelId === id)
  const profileIds = useAppSelector((s) => s.connection.profiles.map((p) => p.id))
  const detailProfileId = useAppSelector((s) => s.ui.detailTarget?.profileId ?? null)
  const serverIds = panelServerIds(item, profileIds, detailProfileId)

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
        {serverIds.length > 0 && (
          <span className="flex items-center gap-1" aria-hidden title="Servers shown">
            {serverIds.map((sid) => (
              <span
                key={sid}
                className="h-2.5 w-2.5 rounded-[3px]"
                style={{ backgroundColor: serverColor(sid) }}
              />
            ))}
          </span>
        )}
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
