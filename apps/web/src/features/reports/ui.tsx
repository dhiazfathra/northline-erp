import type { ReactNode } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { cn } from '@/lib/utils'

/** The design's 16px checkbox + label row. */
export function Check({ on, onChange, children, disabled, className }: { on: boolean; onChange?: (v: boolean) => void; children?: ReactNode; disabled?: boolean; className?: string }) {
  return (
    <label className={cn('flex w-fit cursor-pointer items-center gap-2.5 py-[7px] text-[13px]', disabled && 'cursor-default', className)}>
      <Checkbox
        checked={on}
        disabled={disabled}
        onCheckedChange={(v) => onChange?.(v === true)}
        className="size-4 rounded-[5px] border-[rgba(var(--fg),.35)] bg-transparent text-(--paper) shadow-none data-checked:border-(--ink) data-checked:bg-(--ink) data-checked:text-(--paper) dark:data-checked:bg-(--ink) [&_svg]:size-3"
      />
      {children}
    </label>
  )
}

export function Radios<V extends string>({ value, onChange, options, className }: { value: V; onChange: (v: V) => void; options: { v: V; label: ReactNode }[]; className?: string }) {
  return (
    <RadioGroup value={value} onValueChange={(v) => onChange(v as V)} className={cn('flex flex-col gap-0', className)}>
      {options.map((o) => (
        <label key={o.v} className="flex w-fit cursor-pointer items-center gap-2.5 py-[7px] text-[13px]">
          <RadioGroupItem value={o.v} className="size-4 border-[rgba(var(--fg),.35)] bg-transparent data-checked:border-(--ink) data-checked:bg-transparent dark:data-checked:bg-transparent [&_span]:bg-(--ink)" />
          {o.label}
        </label>
      ))}
    </RadioGroup>
  )
}

export const kicker = 'text-[10.5px] uppercase tracking-[.5px] opacity-55'
export const inp = 'w-full rounded-[12px] border border-[rgba(var(--fg),.18)] bg-[rgba(var(--fg),.06)] px-3 py-2.5 text-[13px] text-(--ink) outline-none'
export const iconBtn = 'flex size-[30px] cursor-pointer items-center justify-center rounded-full hover:bg-[rgba(var(--fg),.12)]'
export const pill = 'flex h-[34px] cursor-pointer items-center gap-1.5 rounded-[17px] px-3.5 text-[12.5px] hover:opacity-85'
export const xBtn = 'flex size-8 flex-none cursor-pointer items-center justify-center rounded-full bg-[rgba(var(--fg),.1)]'
export const modal = 'font-light border border-[rgba(var(--fg),.16)] bg-(--panel) text-(--ink) shadow-[0_30px_70px_rgba(0,0,0,.4)] backdrop-blur-[26px] [animation:pop_.22s_ease-out] rounded-[28px] sm:max-w-none'
