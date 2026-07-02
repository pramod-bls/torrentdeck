import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'

export function Checkbox({
  checked,
  onCheckedChange,
  className,
  'aria-label': ariaLabel
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  className?: string
  'aria-label'?: string
}): React.JSX.Element {
  return (
    <CheckboxPrimitive.Root
      checked={checked}
      onCheckedChange={(v) => onCheckedChange(v === true)}
      aria-label={ariaLabel}
      className={cn(
        'flex h-4 w-4 shrink-0 items-center justify-center rounded border border-neutral-400 bg-white data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 dark:border-neutral-500 dark:bg-neutral-800',
        className
      )}
    >
      <CheckboxPrimitive.Indicator>
        <Check size={12} className="text-white" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export function LabeledCheckbox({
  checked,
  onCheckedChange,
  label
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label: string
}): React.JSX.Element {
  return (
    <label className="flex items-center gap-2 text-sm">
      <Checkbox checked={checked} onCheckedChange={onCheckedChange} aria-label={label} />
      {label}
    </label>
  )
}
