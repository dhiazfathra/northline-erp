import { useState } from 'react'
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useShell } from '@/lib/shell'
import { cn } from '@/lib/utils'

/** Searchable select used across forms (the design's `Dropdown` component). */
export function Dropdown({
  value,
  options,
  onSelect,
  placeholder,
  noClear,
  disabled,
  invalid,
  className,
  id,
}: {
  value: string
  options: string[]
  onSelect: (v: string) => void
  placeholder?: string
  noClear?: boolean
  disabled?: boolean
  invalid?: boolean
  className?: string
  id?: string
}) {
  const { lang } = useShell()
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          id={id}
          type="button"
          aria-invalid={invalid || undefined}
          className={cn(
            'field flex h-[42px] w-full cursor-pointer items-center gap-2 px-3.5 text-left disabled:cursor-not-allowed disabled:opacity-60',
            invalid && 'border-[#f472b6]',
            className,
          )}
        >
          <span className={cn('min-w-0 flex-1 truncate', !value && 'opacity-50')}>{value || placeholder || (lang === 'id' ? 'Pilih…' : 'Select…')}</span>
          {value && !noClear && !disabled && (
            <span
              role="button"
              aria-label={lang === 'id' ? 'Hapus pilihan' : 'Clear'}
              className="flex size-5 items-center justify-center rounded-full opacity-60 hover:bg-[rgba(var(--fg),.15)] hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation()
                onSelect('')
              }}
            >
              ×
            </span>
          )}
          <svg width="8" height="5" viewBox="0 0 8 5" className="flex-none">
            <path d="M1 1l3 3 3-3" style={{ stroke: 'var(--ink)' }} fill="none" />
          </svg>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="glass-pop w-(--radix-popover-trigger-width) min-w-[200px] rounded-2xl p-1.5 text-(--ink)">
        <Command className="bg-transparent text-(--ink)">
          {options.length > 6 && <CommandInput placeholder={lang === 'id' ? 'Cari…' : 'Search…'} className="text-[13px]" />}
          <CommandList className="max-h-64">
            <CommandEmpty className="py-4 text-center text-xs opacity-60">{lang === 'id' ? 'Tidak ada data' : 'No results'}</CommandEmpty>
            {options.map((o) => (
              <CommandItem
                key={o}
                value={o}
                onSelect={() => {
                  onSelect(o)
                  setOpen(false)
                }}
                className={cn(
                  'rounded-[10px] px-2.5 py-2 text-[13px] text-(--ink) data-[selected=true]:bg-[rgba(var(--fg),.1)] data-[selected=true]:text-(--ink)',
                  o === value && 'bg-[rgba(var(--fg),.12)]',
                )}
              >
                {o}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
