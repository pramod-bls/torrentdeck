import { LayoutGrid, Plus, RotateCcw } from 'lucide-react'
import type { PanelTypeId } from '@shared/types'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import {
  layoutReset,
  panelAdded,
  selectPanelInstances
} from '@/features/workspace/workspaceSlice'
import { PANELS, PANEL_CATEGORIES } from '@/features/workspace/panels'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown'

/**
 * Toolbar picker for composing the workspace: grouped by category, driven
 * entirely by the PANELS registry. Single-instance panel types are disabled
 * while already placed.
 */
export function AddPanelMenu(): React.JSX.Element {
  const dispatch = useAppDispatch()
  const items = useAppSelector((s) => s.workspace.layout?.items)
  const present = selectPanelInstances(items)

  const canAdd = (type: PanelTypeId): boolean =>
    PANELS[type].multiInstance || !present.has(type)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="Panels">
          <LayoutGrid size={14} /> Panels
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {PANEL_CATEGORIES.map((category) => (
          <div key={category}>
            <DropdownMenuLabel>{category}</DropdownMenuLabel>
            {Object.values(PANELS)
              .filter((meta) => meta.category === category)
              .map((meta) => (
                <DropdownMenuItem
                  key={meta.type}
                  disabled={!canAdd(meta.type)}
                  onSelect={() => dispatch(panelAdded(meta.type))}
                >
                  <Plus size={13} /> {meta.title}
                </DropdownMenuItem>
              ))}
          </div>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => dispatch(layoutReset())}>
          <RotateCcw size={13} /> Reset layout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
