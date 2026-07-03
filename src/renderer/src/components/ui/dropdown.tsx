import * as Dropdown from '@radix-ui/react-dropdown-menu'
import { cn } from '@/lib/cn'

export const DropdownMenu = Dropdown.Root
export const DropdownMenuTrigger = Dropdown.Trigger

export function DropdownMenuContent({
  children,
  className,
  align = 'start'
}: {
  children: React.ReactNode
  className?: string
  align?: 'start' | 'center' | 'end'
}): React.JSX.Element {
  return (
    <Dropdown.Portal>
      <Dropdown.Content
        align={align}
        sideOffset={4}
        className={cn(
          'z-50 min-w-44 rounded-md border border-surface-200 bg-surface-50 p-1 text-sm shadow-lg dark:border-surface-700 dark:bg-surface-800',
          className
        )}
      >
        {children}
      </Dropdown.Content>
    </Dropdown.Portal>
  )
}

export function DropdownMenuItem({
  children,
  onSelect,
  disabled,
  destructive
}: {
  children: React.ReactNode
  onSelect?: () => void
  disabled?: boolean
  destructive?: boolean
}): React.JSX.Element {
  return (
    <Dropdown.Item
      disabled={disabled}
      onSelect={onSelect}
      className={cn(
        'flex cursor-default items-center gap-2 rounded px-2 py-1.5 outline-none select-none data-[disabled]:opacity-50 data-highlighted:bg-surface-100 dark:data-highlighted:bg-surface-700',
        destructive && 'text-danger-600 dark:text-danger-400'
      )}
    >
      {children}
    </Dropdown.Item>
  )
}

export function DropdownMenuSeparator(): React.JSX.Element {
  return <Dropdown.Separator className="my-1 h-px bg-surface-200 dark:bg-surface-700" />
}

export function DropdownMenuLabel({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <Dropdown.Label className="px-2 py-1 text-xs font-medium text-surface-500 dark:text-surface-400">
      {children}
    </Dropdown.Label>
  )
}
