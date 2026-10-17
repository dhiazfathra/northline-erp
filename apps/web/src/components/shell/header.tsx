import { Link, useNavigate } from '@tanstack/react-router'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useCurrentWorkspace } from '@/api/workspaces'
import { useShell } from '@/lib/shell'
import { cn } from '@/lib/utils'

/** Ref glass for the profile popover (brighter than glass-pop). */
const profileGlass =
  'border border-[rgba(255,255,255,.35)] backdrop-blur-[28px] backdrop-brightness-[1.08] backdrop-saturate-[1.8] [background:linear-gradient(135deg,rgba(255,255,255,.28),rgba(255,255,255,.06)_55%,rgba(255,255,255,.14))] shadow-[inset_0_1px_0_rgba(255,255,255,.7),inset_0_-1px_0_rgba(255,255,255,.15),inset_0_0_18px_rgba(255,255,255,.12),0_12px_32px_rgba(0,0,0,.22)]'

function Segmented<T extends string>({ value, options, onChange, pad }: { value: T; options: { v: T; n: string }[]; onChange: (v: T) => void; pad: string }) {
  return (
    <span className="flex gap-0.5 rounded-2xl border border-[rgba(var(--fg),.12)] bg-[rgba(var(--fg),.06)] p-[3px]">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={cn('cursor-pointer rounded-[13px] py-1', pad, o.v === value ? 'bg-(--ink) text-(--paper)' : 'text-(--ink)')}
        >
          {o.n}
        </button>
      ))}
    </span>
  )
}

export function Header() {
  const { L, mode, setMode, lang, setLang, isMobile, isDesktop, megaOpen, setMegaOpen } = useShell()
  const navigate = useNavigate()
  const ws = useCurrentWorkspace()
  const p = (d: string, t: string, m: string) => (isDesktop ? d : isMobile ? m : t)
  return (
    <div className={cn('relative z-20 flex flex-none items-center justify-between gap-3', p('px-10 pt-[26px]', 'px-6 pt-5', 'px-4 pt-3.5'))}>
      <Link to="/" className="flex cursor-pointer items-center gap-3.5">
        <span className="grid grid-cols-[repeat(3,3px)] gap-[3px]">
          {Array.from({ length: 9 }, (_, i) => (
            <span key={i} className="size-[3px] rounded-full bg-(--ink)" />
          ))}
        </span>
        <span className="text-[15px] font-medium">Northline</span>
        {!isMobile && (
          <>
            <span className="h-3 w-px bg-[rgba(var(--fg),.4)]" />
            <span className="text-xs whitespace-nowrap opacity-80">{L.ledger}</span>
          </>
        )}
      </Link>
      <div className={cn('flex min-w-0 items-center text-xs', p('gap-[22px]', 'gap-4', 'gap-2'))}>
        {isDesktop && ws.data && (
          <Link to="/workspaces" className="cursor-pointer whitespace-nowrap opacity-45 hover:opacity-90">
            {ws.data.name}
          </Link>
        )}
        <Segmented value={mode} onChange={setMode} pad="px-[11px]" options={[{ v: 'dark', n: lang === 'id' ? 'Gelap' : 'Dark' }, { v: 'light', n: lang === 'id' ? 'Terang' : 'Light' }]} />
        <Segmented value={lang} onChange={setLang} pad="px-[9px]" options={[{ v: 'en', n: 'EN' }, { v: 'id', n: 'ID' }]} />
        <button
          type="button"
          onClick={() => setMegaOpen(!megaOpen)}
          className={cn('flex cursor-pointer items-center gap-2 rounded-2xl border border-[rgba(var(--fg),.2)]', isMobile ? 'p-[11px]' : 'px-3.5 py-[7px]', megaOpen ? 'bg-[rgba(var(--fg),.18)]' : 'bg-[rgba(var(--fg),.06)]')}
        >
          <span className="grid grid-cols-[repeat(2,4px)] gap-0.5">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="size-1 rounded-[1px] bg-(--ink)" />
            ))}
          </span>
          {!isMobile && <span className="whitespace-nowrap">{L.allModules}</span>}
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn('flex cursor-pointer items-center justify-center rounded-full border border-[rgba(var(--fg),.5)] text-[11px] font-normal', isMobile ? 'size-9' : 'size-[30px]')}
            >
              MK
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={9} className={cn(profileGlass, 'w-[220px] rounded-[18px] p-3.5 text-(--ink) ring-0')}>
            <div className="text-sm">Maya Kerr</div>
            <div className="mt-0.5 text-[11px] opacity-70">maya.kerr@harborco.com</div>
            <div className="mt-0.5 mb-2.5 text-[11px] opacity-55">{L.role}</div>
            <DropdownMenuItem className="rounded-[10px] px-2.5 py-[9px] text-xs focus:bg-[rgba(var(--fg),.1)] focus:text-(--ink)" onSelect={() => navigate({ to: '/workspaces' })}>
              {L.switchWs}
            </DropdownMenuItem>
            <DropdownMenuItem className="rounded-[10px] px-2.5 py-[9px] text-xs opacity-70 focus:bg-[rgba(var(--fg),.1)] focus:text-(--ink)" onSelect={() => navigate({ to: '/auth' })}>
              {L.signOut}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
