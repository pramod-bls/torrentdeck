/**
 * The panel grid (ADR-0002). Renders the active profile's WorkspaceLayout
 * with react-grid-layout v2: panels drag by their PanelChrome header, resize
 * from the south/south-east edges, and vertical compaction keeps the grid
 * gap-free. Every user rearrangement flows through gridChanged, which the
 * persistence middleware writes through to electron-store per profile.
 */
import { useCallback, useMemo } from 'react'
import { GridLayout, useContainerWidth, type Layout } from 'react-grid-layout'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { gridChanged, type GridPositions } from '@/features/workspace/workspaceSlice'
import { GRID_COLS, GRID_ROW_HEIGHT, PANELS } from '@/features/workspace/panels'
import { PANEL_COMPONENTS } from '@/features/workspace/registry'
import { PanelChrome } from './PanelChrome'

export function Workspace(): React.JSX.Element {
  const dispatch = useAppDispatch()
  const layout = useAppSelector((s) => s.workspace.layout)
  const { width, containerRef, mounted } = useContainerWidth()

  const rglLayout: Layout = useMemo(
    () =>
      (layout?.items ?? []).map((it) => ({
        i: it.i,
        x: it.x,
        y: it.y,
        w: it.w,
        h: it.h,
        minW: PANELS[it.type].minW,
        minH: PANELS[it.type].minH
      })),
    [layout]
  )

  const onLayoutChange = useCallback(
    (next: Layout) => {
      const positions: GridPositions = {}
      for (const it of next) positions[it.i] = { x: it.x, y: it.y, w: it.w, h: it.h }
      dispatch(gridChanged(positions))
    },
    [dispatch]
  )

  return (
    <div ref={containerRef} className="min-h-0 flex-1 overflow-y-auto bg-neutral-100 dark:bg-neutral-950">
      {mounted && layout && (
        <GridLayout
          width={width}
          layout={rglLayout}
          gridConfig={{ cols: GRID_COLS, rowHeight: GRID_ROW_HEIGHT, margin: [8, 8] }}
          dragConfig={{ handle: '.panel-drag-handle' }}
          resizeConfig={{ handles: ['se', 's'] }}
          onLayoutChange={onLayoutChange}
        >
          {(layout.items ?? []).map((it) => (
            <div key={it.i}>
              <PanelChrome id={it.i} title={PANELS[it.type].title}>
                {PANEL_COMPONENTS[it.type](it)}
              </PanelChrome>
            </div>
          ))}
        </GridLayout>
      )}
      {layout && layout.items.length === 0 && (
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-neutral-500">
            All panels removed — use Panels → Add panel, or Reset layout
          </p>
        </div>
      )}
    </div>
  )
}
