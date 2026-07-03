import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { setShortcutsOpen } from '@/features/ui/uiSlice'
import { Dialog, DialogContent } from '@/components/ui/dialog'

const IS_MAC = navigator.platform.startsWith('Mac')
const MOD = IS_MAC ? '⌘' : 'Ctrl+'

const SECTIONS: { title: string; rows: [string, string][] }[] = [
  {
    title: 'Global',
    rows: [
      [`${MOD}N`, 'Add magnet link'],
      [`${MOD}O`, 'Add torrent file'],
      [`${MOD}F`, 'Search in focused panel'],
      [`${MOD},`, 'Preferences']
    ]
  },
  {
    title: 'Focused Torrents panel',
    rows: [
      ['↑ / ↓', 'Move selection'],
      ['⇧↑ / ⇧↓', 'Extend selection'],
      [`${MOD}A`, 'Select all'],
      ['Space', 'Pause / resume selection'],
      [IS_MAC ? '⌘⌫ / Delete' : 'Delete', 'Remove selection…'],
      ['Esc', 'Clear selection']
    ]
  }
]

export function ShortcutsDialog(): React.JSX.Element | null {
  const dispatch = useAppDispatch()
  const open = useAppSelector((s) => s.ui.shortcutsOpen)
  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={(v) => !v && dispatch(setShortcutsOpen(false))}>
      <DialogContent title="Keyboard shortcuts">
        <div className="space-y-4">
          {SECTIONS.map(({ title, rows }) => (
            <div key={title}>
              <p className="mb-1 text-xs font-semibold text-surface-500 uppercase">{title}</p>
              <table className="w-full text-sm">
                <tbody>
                  {rows.map(([keys, desc]) => (
                    <tr key={keys}>
                      <td className="w-28 py-1">
                        <kbd className="rounded border border-surface-300 bg-surface-100 px-1.5 py-0.5 font-mono text-xs dark:border-surface-600 dark:bg-surface-800">
                          {keys}
                        </kbd>
                      </td>
                      <td className="py-1 text-surface-600 dark:text-surface-300">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
