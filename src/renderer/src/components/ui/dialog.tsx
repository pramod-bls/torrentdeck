import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

export function DialogContent({
  title,
  children,
  className,
  wide
}: {
  title: string
  children: React.ReactNode
  className?: string
  wide?: boolean
}): React.JSX.Element {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/40" />
      <DialogPrimitive.Content
        className={cn(
          'fixed top-1/2 left-1/2 z-50 max-h-[85vh] w-full -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-surface-200 bg-surface-50 p-4 shadow-xl focus:outline-none dark:border-surface-700 dark:bg-surface-800',
          wide ? 'max-w-2xl' : 'max-w-md',
          className
        )}
      >
        <div className="mb-3 flex items-center justify-between">
          <DialogPrimitive.Title className="text-sm font-semibold">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Close asChild>
            <button
              type="button"
              aria-label="Close"
              className="rounded p-1 text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700"
            >
              <X size={14} />
            </button>
          </DialogPrimitive.Close>
        </div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}
