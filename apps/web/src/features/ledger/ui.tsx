import { useLocation } from '@tanstack/react-router'
import { AlertDialog as A } from 'radix-ui'
import type { ReactNode } from 'react'
import { navFor } from '@/lib/nav'
import { useShell, useT } from '@/lib/shell'
import { cn } from '@/lib/utils'

export const fmt = (n: number) => n.toLocaleString('id-ID')

export const btnOutline =
  'flex cursor-pointer items-center gap-1.5 rounded-[18px] border border-[rgba(var(--fg),.3)] bg-transparent px-4 py-[9px] text-[12.5px] text-(--ink)'
export const btnInk =
  'flex cursor-pointer items-center gap-1.5 rounded-[18px] border-none bg-(--ink) px-4 py-[9px] text-[12.5px] text-(--paper) disabled:cursor-not-allowed'

/** The `isDoc` frame: module eyebrow + title, optional segmented sub-tabs on the right. */
export function Frame({ subs, children }: { subs?: ReactNode; children: ReactNode }) {
  const { pathname } = useLocation()
  const { isMobile } = useShell()
  const t = useT()
  const nav = navFor(pathname)
  return (
    <div className="flex-none animate-[fade_.25s] px-10 pt-5 pb-8 max-[719px]:px-4">
      <div className="mb-[18px] flex flex-wrap items-end justify-between gap-3.5">
        <div>
          <div className="text-[11px] tracking-[.5px] uppercase opacity-60">{nav && t(nav.mod.name)}</div>
          <div className={cn('mt-1 tracking-[-.3px]', isMobile ? 'text-[22px]' : 'text-[28px]')}>{nav && t(nav.sub.label)}</div>
        </div>
        {subs}
      </div>
      {children}
    </div>
  )
}

export function Seg({
  items,
  value,
  onChange,
  className,
}: {
  items: { id: string; n: string }[]
  value: string
  onChange: (id: string) => void
  className?: string
}) {
  return (
    <div role="tablist" className={cn('flex gap-1 self-start rounded-[20px] bg-[rgba(var(--fg),.08)] p-1', className)}>
      {items.map((x) => (
        <button
          key={x.id}
          role="tab"
          type="button"
          aria-selected={x.id === value}
          onClick={() => onChange(x.id)}
          className={cn('cursor-pointer rounded-2xl px-3.5 py-[7px] text-xs', x.id === value ? 'bg-(--ink) text-(--paper)' : 'text-(--ink)')}
        >
          {x.n}
        </button>
      ))}
    </div>
  )
}

export const overlayCls = 'fixed inset-0 z-[91] animate-[fade_.2s] bg-[rgba(0,0,0,.45)] backdrop-blur-[4px]'
export const panelCls =
  'fixed top-1/2 left-1/2 z-[92] flex w-[min(460px,calc(100%-32px))] -translate-x-1/2 -translate-y-1/2 animate-[fade_.2s] flex-col gap-3.5 rounded-[28px] border border-[rgba(255,255,255,.18)] bg-(--panel) p-6 font-light text-(--ink) backdrop-blur-[26px] outline-none'

/** Confirm/alert modal from the template (`prOpen`, `dlOpen`, `owOpen`). */
export function Confirm({
  open,
  onOpenChange,
  icon,
  title,
  children,
  actions,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  icon: ReactNode
  title: string
  children: ReactNode
  actions: ReactNode
}) {
  return (
    <A.Root open={open} onOpenChange={onOpenChange}>
      <A.Portal>
        <A.Overlay className={overlayCls} />
        <A.Content className={panelCls}>
          <div className="flex items-center gap-2.5">
            {icon}
            <A.Title className="text-[18px] leading-[1.25] font-light">{title}</A.Title>
          </div>
          <A.Description asChild>
            <div className="text-[13.5px] leading-normal">{children}</div>
          </A.Description>
          <div className="mt-1 flex justify-end gap-2">{actions}</div>
        </A.Content>
      </A.Portal>
    </A.Root>
  )
}
export const ConfirmCancel = A.Cancel
export const ConfirmAction = A.Action
