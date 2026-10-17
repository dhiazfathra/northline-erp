import { useNavigate } from '@tanstack/react-router'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { useEffect, useRef, useState, type RefObject } from 'react'
import { Command as CommandPrimitive } from 'cmdk'
import { Command, CommandEmpty, CommandItem, CommandList } from '@/components/ui/command'
import { useEnabledFeatures } from '@/lib/features'
import { isLocked, kindColor, kindLabel, modules, notDesigned, type NavSub } from '@/lib/nav'
import { useShell, useT } from '@/lib/shell'
import { cn } from '@/lib/utils'

export function MegaMenu() {
  const { L, megaOpen, setMegaOpen, isMobile, isDesktop, showToast } = useShell()
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
            '[background:linear-gradient(135deg,rgba(255,255,255,.16),rgba(255,255,255,.04)_45%,rgba(255,255,255,.09)),var(--mega-panel)]',
            isMobile ? 'top-[62px] right-2.5 left-2.5 h-[calc(100dvh-72px)] grid-rows-[auto_minmax(0,1fr)]' : 'max-h-[calc(100dvh-100px)]',
            isDesktop ? 'top-[76px] right-10 left-10 grid-cols-[300px_minmax(0,1fr)]' : !isMobile && 'top-[70px] right-6 left-6 grid-cols-[260px_minmax(0,1fr)]',
          )}
        >
          <DialogPrimitive.Title className="sr-only">{L.allModules}</DialogPrimitive.Title>
          <div
            className={cn(
              'no-scrollbar flex min-h-0 gap-0.5 overflow-auto',
              isMobile ? 'flex-row border-b border-[rgba(var(--fg),.1)] p-2.5' : 'flex-col border-r border-[rgba(var(--fg),.1)] px-2.5 py-[18px]',
            )}
          >
            {!isMobile && <span className="px-3.5 pb-3 text-[13px] tracking-[.5px] uppercase opacity-65">{L.modules}</span>}
            {modules.map((m) => (
              <div
                key={m.id}
                onMouseEnter={() => setModId(m.id)}
                onClick={() => setModId(m.id)}
                className={cn(
                  'flex flex-none cursor-pointer items-center justify-between gap-3.5 rounded-[14px] px-4 py-3.5 text-[17px] whitespace-nowrap hover:bg-[rgba(var(--fg),.1)]',
                  m.id === modId && 'bg-[rgba(var(--fg),.14)]',
                )}
              >
                <span className="flex items-center gap-3.5">
                  <i className={cn(m.icon, 'text-2xl opacity-85')} />
                  {t(m.name)}
                </span>
                <span className="text-sm opacity-65">{m.subs.length}</span>
              </div>
            ))}
          </div>
          <div className={cn('min-h-0 overflow-y-auto', isMobile ? 'px-3.5 pt-4 pb-[18px]' : 'px-[26px] pt-[22px] pb-[26px]')}>
            <div className="flex flex-wrap items-end justify-between gap-2.5 border-b border-[rgba(var(--fg),.14)] pb-3.5">
              <span className={cn('flex items-center gap-3 tracking-[-.3px]', isMobile ? 'text-2xl' : 'text-[30px]')}>
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
            <div className={cn('mt-5 grid gap-3', isDesktop ? 'grid-cols-4' : isMobile ? 'grid-cols-2' : 'grid-cols-3')}>
              {mod.subs.map((s) => {
                const off = isLocked(s, enabled)
                return (
                  <div
                    key={t(s.label)}
                    onClick={() => go(s)}
                    aria-disabled={off}
                    title={off ? t(s.offNote!) : undefined}
                    className={cn(
                      'glass-card flex min-h-[120px] flex-col justify-between gap-3 rounded-[20px] border-[rgba(var(--fg),.22)] p-[18px] shadow-[inset_0_1px_0_rgba(var(--fg),.12)] transition-[background] duration-200 hover:bg-[rgba(var(--fg),.09)]',
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
  const { L, searchOpen, setSearchOpen, isMobile, isDesktop } = useShell()
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
          className={cn('fixed left-1/2 z-61 w-[min(560px,calc(100%-24px))] -translate-x-1/2 animate-[pop_.2s_ease-out] outline-none', isDesktop ? 'top-[140px]' : isMobile ? 'top-16' : 'top-[120px]')}
        >
          <DialogPrimitive.Title className="sr-only">{L.search}</DialogPrimitive.Title>
          <Command className="overflow-hidden rounded-3xl border border-[rgba(var(--fg),.16)] bg-(--panel) p-0 text-(--ink)">
            <CommandPrimitive.Input placeholder={L.searchPh} className="box-border w-full border-0 border-b border-[rgba(var(--fg),.12)] bg-transparent px-[22px] py-5 text-base text-(--ink) outline-none placeholder:text-[rgba(var(--fg),.5)]" />
            <CommandList className="max-h-[320px] p-2">
              <CommandEmpty className="p-3.5 text-[13px] opacity-60">{L.noMatch}</CommandEmpty>
              {entries.map(({ s, m }) => (
                <CommandItem
                  key={s.to}
                  value={`${t(s.label)} ${t(m.name)}`}
                  onSelect={() => {
                    setSearchOpen(false)
                    navigate({ to: s.to! })
                  }}
                  className="rounded-xl px-3.5 py-3 text-[13px] text-(--ink) data-[selected=true]:bg-[rgba(var(--fg),.1)] data-[selected=true]:text-(--ink)"
                >
                  <span>{t(s.label)}</span>
                  <span className="ml-auto text-[11px] opacity-50">{t(m.name)}</span>
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
      className="fixed bottom-[30px] left-1/2 z-90 box-border max-w-[calc(100%-32px)] -translate-x-1/2 animate-[pop_.2s_ease-out] rounded-[20px] border border-[rgba(255,255,255,.4)] px-5 py-3 text-center text-[13px] font-medium text-(--ink) shadow-[0_14px_30px_rgba(0,0,0,.18),inset_0_1px_0_rgba(255,255,255,.6),inset_0_-1px_0_rgba(255,255,255,.15)] backdrop-blur-[18px] backdrop-saturate-[1.8] [background:linear-gradient(135deg,rgba(255,255,255,.28),rgba(255,255,255,.08))]"
    >
      {toast}
    </div>
  )
}

type Bar = { x: number; y: number; w: number; h: number; i: number; kind: 'c' | 't' }
export type RefreshPhase = 'in' | 'out' | 'done' | null

/** Port of the reference rfMeasure: skeleton boxes for every text run / icon inside visible [data-rf-row] rows. */
function measure(el: HTMLElement) {
  const sr = el.getBoundingClientRect()
  const k = sr.width / (el.offsetWidth || 1) || 1
  const out: Bar[] = []
  const rg = document.createRange()
  const rel = (b: { left: number; top: number; width: number; height: number }, i: number, kind: Bar['kind']) =>
    out.length < 360 && out.push({ x: (b.left - sr.left) / k, y: (b.top - sr.top) / k, w: b.width / k, h: b.height / k, i, kind })
  const walk = (n: Element, i: number) => {
    for (const c of n.children) {
      const cs = getComputedStyle(c)
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue
      const b = c.getBoundingClientRect()
      if (!b.width || !b.height) continue
      if (c.tagName === 'I' || c.tagName === 'svg' || (b.width <= 48 && Math.abs(b.width - b.height) < 3 && parseFloat(cs.borderTopLeftRadius) >= b.width / 2 - 1)) {
        const sz = Math.min(b.width, b.height)
        rel({ left: b.left + (b.width - sz) / 2, top: b.top + (b.height - sz) / 2, width: sz, height: sz }, i, 'c')
        continue
      }
      let L = Infinity, T = Infinity, R = -Infinity, B = -Infinity
      for (const t of c.childNodes)
        if (t.nodeType === 3 && t.textContent?.trim()) {
          rg.selectNodeContents(t)
          const q = rg.getBoundingClientRect()
          L = Math.min(L, q.left); T = Math.min(T, q.top); R = Math.max(R, q.right); B = Math.max(B, q.bottom)
        }
      if (R > L) {
        L = Math.max(L, b.left); R = Math.min(R, b.right)
        if (R - L > 2) rel({ left: L, top: T, width: R - L, height: B - T }, i, 't')
      }
      walk(c, i)
    }
  }
  el.querySelectorAll('[data-rf-row]').forEach((r) => {
    const b = r.getBoundingClientRect()
    if (b.height && b.bottom > sr.top && b.top < sr.bottom) walk(r, out.length ? out[out.length - 1].i + 1 : 0)
  })
  return out
}

/** Reference refresh timeline: 1.7s shimmer in, .35s fade out, check icon until 3.4s. Starts on each rising edge of `refreshing`. */
export function useRefreshPhase(scroll: RefObject<HTMLDivElement | null>) {
  const { refreshing } = useShell()
  const [st, setSt] = useState<{ phase: RefreshPhase; bars: Bar[]; box: { top: number; left: number; w: number; h: number } | null; n: number }>({ phase: null, bars: [], box: null, n: 0 })
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  useEffect(() => {
    if (!refreshing) return
    const el = scroll.current
    timers.current.forEach(clearTimeout)
    setSt((s) => ({ phase: 'in', bars: el ? measure(el) : [], box: el && { top: el.offsetTop, left: el.offsetLeft, w: el.offsetWidth, h: el.offsetHeight }, n: s.n + 1 }))
    timers.current = [
      setTimeout(() => {
        if (el) el.scrollTop = 0
        setSt((s) => ({ ...s, phase: 'out' }))
      }, 1700),
      setTimeout(() => setSt((s) => ({ ...s, phase: 'done' })), 2050),
      setTimeout(() => setSt((s) => ({ ...s, phase: null })), 3400),
    ]
  }, [refreshing, scroll])
  return st
}

/** Shimmer skeleton over measured rows plus the 3px gradient progress bar (reference mkLoader). */
export function RefreshLoader({ rf }: { rf: ReturnType<typeof useRefreshPhase> }) {
  const { mode } = useShell()
  if ((rf.phase !== 'in' && rf.phase !== 'out') || !rf.box) return null
  const sh =
    mode === 'dark'
      ? 'linear-gradient(90deg,rgba(255,255,255,.07) 0%,rgba(255,255,255,.2) 18%,rgba(255,255,255,.07) 36%)'
      : 'linear-gradient(90deg,rgba(0,0,0,.055) 0%,rgba(0,0,0,.13) 18%,rgba(0,0,0,.055) 36%)'
  const b = rf.box
  return (
    <div
      key={rf.n}
      className="pointer-events-none absolute z-14 overflow-hidden"
      style={{ top: b.top, left: b.left, width: b.w, height: b.h, animation: rf.phase === 'out' ? 'rfOut .35s ease forwards' : 'fade .2s' }}
    >
      {rf.bars.map((r, j) => {
        const c = r.kind === 'c'
        const bh = c ? r.h : Math.max(6, Math.min(10, Math.round(r.h * 0.55)))
        return (
          <span
            key={j}
            style={{ position: 'absolute', left: r.x, top: c ? r.y : r.y + (r.h - bh) / 2, width: r.w, height: bh, borderRadius: c ? '50%' : bh / 2, background: sh, backgroundSize: '300% 100%', animation: `shim 1.4s linear ${-(r.i * 0.05)}s infinite` }}
          />
        )
      })}
      <div className="absolute inset-x-0 top-0 h-[3px] overflow-hidden">
        <div className="h-full animate-[prog_1.6s_cubic-bezier(.4,0,.2,1)_forwards] bg-[linear-gradient(90deg,#4338ca,#a855f7,#ec4899)] shadow-[0_0_10px_rgba(236,72,153,.6)]" />
      </div>
    </div>
  )
}
