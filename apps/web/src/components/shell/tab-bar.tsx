import { useLocation, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { kindColor, navFor } from '@/lib/nav'
import { useShell, useT } from '@/lib/shell'
import { cn } from '@/lib/utils'

const OVERVIEW = '/'

export function useTabMeta() {
  const t = useT()
  const { lang } = useShell()
  return (path: string) => {
    if (path === OVERVIEW) return { label: lang === 'id' ? 'Ringkasan' : 'Overview', mod: 'Northline', dot: '#22c55e' }
    const hit = navFor(path)
    if (!hit) return { label: path, mod: '', dot: 'rgba(var(--fg),.5)' }
    const isForm = /\/(new|[^/]*\d[^/]*)$/.test(path) && path !== hit.sub.to
    const label = t(hit.sub.label) + (isForm ? (path.endsWith('/new') ? (lang === 'id' ? ' · Baru' : ' · New') : ` · ${path.split('/').pop()}`) : '')
    return { label, mod: t(hit.mod.name), dot: kindColor[hit.sub.kind] }
  }
}

export function TabBar() {
  const { L, tabs, removeTab, setTabs, dirty, isMobile, refresh, refreshing, lang, setMegaOpen } = useShell()
  const loc = useLocation()
  const navigate = useNavigate()
  const meta = useTabMeta()
  const [confirm, setConfirm] = useState<string | null>(null)
  const all = [OVERVIEW, ...tabs]
  const cur = loc.pathname

  const doClose = (path: string) => {
    const idx = all.indexOf(path)
    removeTab(path)
    if (path === cur) navigate({ to: all[idx - 1] ?? OVERVIEW })
  }
  const close = (path: string) => (dirty.has(path) ? setConfirm(path) : doClose(path))

  return (
    <div className={cn('relative z-15 flex-none', isMobile ? 'px-4' : 'px-8')}>
      <div className="flex h-10 items-end gap-1 border-b border-[rgba(var(--fg),.2)]">
        <div className={cn('no-scrollbar flex min-w-0 flex-1 items-end gap-1 overflow-y-hidden', isMobile ? 'overflow-x-auto' : 'overflow-x-hidden')}>
          {all.map((p) => {
            const m = meta(p)
            const on = p === cur
            return (
              <div
                key={p}
                title={m.label}
                onClick={() => navigate({ to: p })}
                onAuxClick={(e) => e.button === 1 && p !== OVERVIEW && close(p)}
                className={cn(
                  'mb-[-1px] flex h-[38px] min-w-24 flex-[0_1_210px] cursor-pointer animate-[pop_.18s_ease-out] items-center gap-[9px] rounded-t-[14px] border border-b-0 pr-2 pl-3.5 text-[12.5px] backdrop-blur-[24px] backdrop-saturate-200 transition-[background,opacity] hover:opacity-100',
                  on
                    ? 'border-[rgba(255,255,255,.28)] bg-[rgba(var(--fg),.14)] opacity-100 shadow-[inset_0_1px_0_rgba(255,255,255,.45)]'
                    : 'border-transparent bg-[rgba(var(--fg),.04)] opacity-65',
                )}
              >
                <span className="size-1.5 flex-none rounded-full" style={{ background: m.dot }} />
                <span className="min-w-0 flex-1 truncate">{m.label}</span>
                {dirty.has(p) && (
                  <span title="Belum disimpan" aria-label="Belum disimpan" className="flex-none text-[10px] italic opacity-80">
                    ● edit
                  </span>
                )}
                {p !== OVERVIEW && (
                  <span
                    className="flex size-5 flex-none items-center justify-center rounded-full text-sm leading-none opacity-65 hover:bg-[rgba(var(--fg),.2)] hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation()
                      close(p)
                    }}
                  >
                    ×
                  </span>
                )}
              </div>
            )
          })}
          <button
            type="button"
            title={L.openPage}
            onClick={() => setMegaOpen(true)}
            className="glass-btn mb-1 ml-1 flex size-[30px] flex-none cursor-pointer items-center justify-center rounded-full text-[17px] hover:bg-[rgba(255,255,255,.22)]"
          >
            +
          </button>
        </div>
        <button
          type="button"
          onClick={refresh}
          title={lang === 'id' ? 'Muat ulang halaman' : 'Refresh page'}
          className="glass-btn mb-[5px] flex size-[30px] flex-none cursor-pointer items-center justify-center rounded-full text-[15px] transition-[background] hover:bg-[rgba(255,255,255,.22)]"
        >
          <i className="ph-light ph-arrows-clockwise block" style={{ animation: refreshing ? 'spin .8s linear infinite' : undefined, color: refreshing ? '#ec4899' : undefined }} />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="glass-btn mb-[5px] flex flex-none cursor-pointer items-center gap-2 rounded-[14px] px-3 py-1.5 text-xs data-[state=open]:bg-[rgba(var(--fg),.16)]">
              {all.length}
              <svg width="8" height="5" viewBox="0 0 8 5">
                <path d="M1 1l3 3 3-3" style={{ stroke: 'var(--ink)' }} fill="none" />
              </svg>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={6} className="glass-pop w-[260px] rounded-[22px] p-2 text-(--ink)">
            <DropdownMenuLabel className="px-2.5 pt-1.5 pb-2 text-[10.5px] font-normal tracking-[.5px] uppercase opacity-50">{L.openTabs}</DropdownMenuLabel>
            {all.map((p) => {
              const m = meta(p)
              return (
                <DropdownMenuItem
                  key={p}
                  onSelect={() => navigate({ to: p })}
                  className={cn('gap-2.5 rounded-[10px] px-2.5 py-[9px] text-[12.5px] focus:bg-[rgba(var(--fg),.1)] focus:text-(--ink)', p === cur && 'bg-[rgba(var(--fg),.1)]')}
                >
                  <span className="size-1.5 rounded-full" style={{ background: m.dot }} />
                  <span className="flex-1 truncate">{m.label}</span>
                  <span className="text-[10.5px] opacity-45">{m.mod}</span>
                  {p !== OVERVIEW && (
                    <span
                      className="px-1 opacity-60"
                      onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        close(p)
                      }}
                    >
                      ×
                    </span>
                  )}
                </DropdownMenuItem>
              )
            })}
            <DropdownMenuSeparator className="mx-1 my-1.5 bg-[rgba(var(--fg),.1)]" />
            <DropdownMenuItem
              className="rounded-[10px] px-2.5 py-[9px] text-[12.5px] opacity-80 focus:bg-[rgba(var(--fg),.1)] focus:text-(--ink)"
              onSelect={() => setTabs(tabs.filter((p) => p === cur || dirty.has(p)))}
            >
              {L.closeOthers}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="rounded-[10px] px-2.5 py-[9px] text-[12.5px] opacity-80 focus:bg-[rgba(var(--fg),.1)] focus:text-(--ink)"
              onSelect={() => {
                setTabs(tabs.filter((p) => dirty.has(p)))
                if (!dirty.has(cur)) navigate({ to: OVERVIEW })
              }}
            >
              {L.closeAll}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent className="w-[min(420px,calc(100%-32px))] max-w-none gap-3.5 rounded-[28px] border border-[rgba(255,255,255,.18)] bg-(--panel) p-6 text-(--ink) ring-0 backdrop-blur-[26px] sm:max-w-none">
          <div className="text-[11px] tracking-[.5px] uppercase opacity-70">{confirm && meta(confirm).label}</div>
          <AlertDialogTitle className="text-xl leading-tight font-light">{lang === 'id' ? 'Tutup tab tanpa menyimpan?' : 'Close tab without saving?'}</AlertDialogTitle>
          <AlertDialogDescription className="text-[13px] leading-normal text-(--ink) opacity-80">
            {lang === 'id' ? 'Perubahan yang belum disimpan akan hilang.' : 'Unsaved changes will be lost.'}
          </AlertDialogDescription>
          <div className="mt-1.5 flex justify-end gap-2">
            <button autoFocus type="button" className="cursor-pointer rounded-[18px] border border-[rgba(var(--fg),.3)] px-4 py-[9px] text-xs" onClick={() => setConfirm(null)}>
              {lang === 'id' ? 'Batal' : 'Cancel'}
            </button>
            <button
              type="button"
              className="cursor-pointer rounded-[18px] bg-[#ef4444] px-4 py-[9px] text-xs text-white"
              onClick={() => {
                if (confirm) doClose(confirm)
                setConfirm(null)
              }}
            >
              {lang === 'id' ? 'Tutup tanpa simpan' : 'Close without saving'}
            </button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
