import { Link, useNavigate } from '@tanstack/react-router'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useCurrentWorkspace } from '@/api/workspaces'
import { useShell } from '@/lib/shell'
import { cn } from '@/lib/utils'

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
  return (
    <div className={cn('relative z-20 flex flex-none items-center justify-between gap-3', isMobile ? 'px-4 pt-4 pb-3' : 'px-8 pt-5 pb-4')}>
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
      <div className={cn('flex items-center text-xs', isMobile ? 'gap-2' : 'gap-3.5')}>
        {isDesktop && ws.data && (
          <Link to="/workspaces" className="cursor-pointer whitespace-nowrap opacity-45 hover:opacity-90">
            {ws.data.name}
          </Link>
        )}
        <Segmented value={mode} onChange={setMode} pad="px-[11px]" options={[{ v: 'dark', n: lang === 'id' ? 'Gelap' : 'Dark' }, { v: 'light', n: lang === 'id' ? 'Terang' : 'Light' }]} />
        <Segmented value={lang} onChange={setLang} pad="px-[9px]" options={[{ v: 'id', n: 'ID' }, { v: 'en', n: 'EN' }]} />
        <button
          type="button"
          onClick={() => setMegaOpen(!megaOpen)}
          className={cn('flex cursor-pointer items-center gap-2 rounded-2xl border border-[rgba(var(--fg),.2)]', isMobile ? 'p-2' : 'px-3.5 py-[7px]', megaOpen && 'bg-[rgba(var(--fg),.16)]')}
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
              className={cn('flex cursor-pointer items-center justify-center rounded-full border border-[rgba(var(--fg),.5)] text-[11px] font-normal', isMobile ? 'size-[30px]' : 'size-[34px]')}
            >
              MK
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={6} className="glass-pop w-[220px] rounded-[18px] p-3.5 text-(--ink)">
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
