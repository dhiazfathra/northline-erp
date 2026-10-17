import { useNavigate } from '@tanstack/react-router'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { useEffect, useState } from 'react'
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { useEnabledFeatures } from '@/lib/features'
import { isLocked, kindColor, kindLabel, modules, notDesigned, type NavSub } from '@/lib/nav'
import { useShell, useT } from '@/lib/shell'
import { cn } from '@/lib/utils'

export function MegaMenu() {
  const { L, megaOpen, setMegaOpen, isMobile, showToast } = useShell()
  const t = useT()
  const navigate = useNavigate()
  const [modId, setModId] = useState(modules[0].id)
  const mod = modules.find((m) => m.id === modId) ?? modules[0]
  const enabled = useEnabledFeatures()
  const go = (s: NavSub) => {
    if (isLocked(s, enabled)) return showToast(t(s.offNote!))
    if (!s.to) return showToast(t(notDesigned))
    setMegaOpen(false)
    navigate({ to: s.to })
  }
  return (
    <DialogPrimitive.Root open={megaOpen} onOpenChange={setMegaOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-30 animate-[fade_.2s] bg-black/30" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            'fixed z-31 grid animate-[pop_.2s_ease-out] overflow-hidden rounded-[28px] border border-[rgba(255,255,255,.28)] text-(--ink) shadow-[inset_0_1px_0_rgba(255,255,255,.45),inset_0_-1px_0_rgba(255,255,255,.08),inset_0_0_30px_rgba(255,255,255,.06),0_30px_70px_rgba(0,0,0,.4)] backdrop-blur-[30px] backdrop-brightness-[1.12] backdrop-saturate-[2.6] outline-none',
            '[background:linear-gradient(135deg,rgba(255,255,255,.16),rgba(255,255,255,.04)_45%,rgba(255,255,255,.09)),var(--panel)]',
            isMobile ? 'top-[70px] right-3 left-3 h-[calc(100dvh-90px)] grid-rows-[auto_1fr]' : 'top-[84px] right-8 left-8 h-[calc(100dvh-120px)] max-h-[720px] grid-cols-[300px_1fr]',
          )}
        >
          <DialogPrimitive.Title className="sr-only">{L.allModules}</DialogPrimitive.Title>
          <div
            className={cn(
              'no-scrollbar flex min-h-0 gap-0.5 overflow-auto',
              isMobile ? 'flex-row border-b border-[rgba(var(--fg),.14)] p-3' : 'flex-col border-r border-[rgba(var(--fg),.14)] px-3.5 py-6',
            )}
          >
            {!isMobile && <span className="px-3.5 pb-3 text-[13px] tracking-[.5px] uppercase opacity-65">{L.modules}</span>}
            {modules.map((m) => (
              <div
                key={m.id}
                onMouseEnter={() => setModId(m.id)}
                onClick={() => setModId(m.id)}
                className={cn(
                  'flex flex-none cursor-pointer items-center justify-between gap-3.5 rounded-[14px] whitespace-nowrap hover:bg-[rgba(var(--fg),.1)]',
                  isMobile ? 'px-3.5 py-2.5 text-sm' : 'px-4 py-3.5 text-[17px]',
                  m.id === modId && 'bg-[rgba(var(--fg),.12)]',
                )}
              >
                <span className="flex items-center gap-3.5">
                  <i className={cn(m.icon, 'opacity-85', isMobile ? 'text-lg' : 'text-2xl')} />
                  {t(m.name)}
                </span>
                <span className="text-sm opacity-65">{m.subs.length}</span>
              </div>
            ))}
          </div>
          <div className={cn('min-h-0 overflow-y-auto', isMobile ? 'p-4' : 'px-8 py-7')}>
            <div className="flex flex-wrap items-end justify-between gap-2.5 border-b border-[rgba(var(--fg),.14)] pb-3.5">
              <span className={cn('flex items-center gap-3 tracking-[-.3px]', isMobile ? 'text-[22px]' : 'text-[32px]')}>
                <i className={cn(mod.icon, 'text-[1.1em] opacity-85')} />
                {t(mod.name)}
              </span>
              <div className="flex flex-wrap gap-x-[18px] gap-y-2 text-sm opacity-85">
                {(Object.keys(kindColor) as (keyof typeof kindColor)[]).map((k) => (
                  <span key={k} className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full" style={{ background: kindColor[k] }} />
                    {t(kindLabel[k])}
                  </span>
                ))}
              </div>
            </div>
            <div className={cn('mt-5 grid gap-3', isMobile ? 'grid-cols-2' : 'grid-cols-[repeat(auto-fill,minmax(190px,1fr))]')}>
              {mod.subs.map((s) => {
                const off = isLocked(s, enabled)
                return (
                  <div
                    key={t(s.label)}
                    onClick={() => go(s)}
                    aria-disabled={off}
                    title={off ? t(s.offNote!) : undefined}
                    className={cn(
                      'glass-card flex min-h-[120px] flex-col justify-between gap-3 rounded-[20px] border-[rgba(var(--fg),.22)] p-[18px] shadow-[inset_0_1px_0_rgba(var(--fg),.12)] transition-[background] hover:bg-[rgba(var(--fg),.09)]',
                      off ? 'cursor-not-allowed border-dashed' : 'cursor-pointer',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <i className={cn(s.icon, 'text-[28px]')} style={{ color: kindColor[s.kind], opacity: off ? 0.5 : 1 }} />
                      {off ? (
                        <i className="ph-light ph-lock-simple text-base" />
                      ) : (
                        <svg width="12" height="12" viewBox="0 0 9 9">
                          <path d="M2 7l5-5M3 2h4v4" style={{ stroke: 'var(--ink)' }} fill="none" strokeWidth="1" />
                        </svg>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[16.5px] leading-[1.3]">{t(s.label)}</span>
                      {off && <span className="text-[11.5px] leading-[1.35] opacity-80">{t(s.offNote!)}</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export function SearchDialog() {
  const { L, searchOpen, setSearchOpen, isMobile } = useShell()
  const t = useT()
  const navigate = useNavigate()
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [setSearchOpen])
  const entries = modules.flatMap((m) => m.subs.filter((s) => s.to).map((s) => ({ s, m })))
  return (
    <DialogPrimitive.Root open={searchOpen} onOpenChange={setSearchOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-60 animate-[fade_.2s] bg-black/45 backdrop-blur-[4px]" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn('fixed left-1/2 z-61 w-[min(560px,calc(100%-24px))] -translate-x-1/2 animate-[pop_.2s_ease-out] outline-none', isMobile ? 'top-16' : 'top-[14vh]')}
        >
          <DialogPrimitive.Title className="sr-only">{L.search}</DialogPrimitive.Title>
          <Command className="glass-pop rounded-3xl bg-transparent p-2 text-(--ink)">
            <CommandInput placeholder={L.searchPh} className="text-[15px] placeholder:text-[rgba(var(--fg),.5)]" />
            <CommandList className="max-h-[50vh]">
              <CommandEmpty className="py-8 text-center text-[13px] opacity-60">{L.noMatch}</CommandEmpty>
              {entries.map(({ s, m }) => (
                <CommandItem
                  key={s.to}
                  value={`${t(s.label)} ${t(m.name)}`}
                  onSelect={() => {
                    setSearchOpen(false)
                    navigate({ to: s.to! })
                  }}
                  className="gap-3 rounded-xl px-3 py-2.5 text-[13px] text-(--ink) data-[selected=true]:bg-[rgba(var(--fg),.1)] data-[selected=true]:text-(--ink)"
                >
                  <i className={cn(s.icon, 'text-lg')} style={{ color: kindColor[s.kind] }} />
                  <span className="flex-1">{t(s.label)}</span>
                  <span className="text-[11px] opacity-50">{t(m.name)}</span>
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export function Toast() {
  const { toast } = useShell()
  if (!toast) return null
  return (
    <div
      role="status"
      className="glass-pop fixed bottom-[30px] left-1/2 z-90 max-w-[calc(100%-32px)] -translate-x-1/2 animate-[up_.25s_ease-out] rounded-[20px] px-5 py-3 text-center text-[13px] text-(--ink)"
    >
      {toast}
    </div>
  )
}

/** Top progress sweep shown while the refresh button is spinning. */
export function RefreshLoader() {
  const { refreshing } = useShell()
  if (!refreshing) return null
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-40 h-0.5 overflow-hidden">
      <div className="h-full w-1/3 animate-[rfSweep_.9s_ease-in-out_infinite] bg-[linear-gradient(90deg,transparent,#ec4899,#a855f7,transparent)]" />
    </div>
  )
}
