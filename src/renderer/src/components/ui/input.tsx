import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-8 w-full rounded-md border border-surface-300 bg-surface-50 px-2.5 text-sm placeholder:text-surface-400 focus-visible:outline-2 focus-visible:outline-accent-500 dark:border-surface-600 dark:bg-surface-800 dark:placeholder:text-surface-500',
        className
      )}
      {...props}
    />
  )
)
Input.displayName = 'Input'

export function Field({
  label,
  children,
  className
}: {
  label: string
  children: React.ReactNode
  className?: string
}): React.JSX.Element {
  return (
    <label className={cn('block space-y-1', className)}>
      <span className="text-xs font-medium text-surface-600 dark:text-surface-400">{label}</span>
      {children}
    </label>
  )
}
