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
          'z-50 min-w-44 rounded-md border border-neutral-200 bg-white p-1 text-sm shadow-lg dark:border-neutral-700 dark:bg-neutral-800',
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
        'flex cursor-default items-center gap-2 rounded px-2 py-1.5 outline-none select-none data-[disabled]:opacity-50 data-highlighted:bg-neutral-100 dark:data-highlighted:bg-neutral-700',
        destructive && 'text-red-600 dark:text-red-400'
      )}
    >
      {children}
    </Dropdown.Item>
  )
}

export function DropdownMenuSeparator(): React.JSX.Element {
  return <Dropdown.Separator className="my-1 h-px bg-neutral-200 dark:bg-neutral-700" />
}

export function DropdownMenuLabel({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <Dropdown.Label className="px-2 py-1 text-xs font-medium text-neutral-500 dark:text-neutral-400">
      {children}
    </Dropdown.Label>
  )
}
