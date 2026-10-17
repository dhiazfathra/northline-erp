import { useShell, useT } from '@/lib/shell'
import { cn } from '@/lib/utils'

/** The heavy liquid-glass surface shared by the tenant list and auth card. */
export const heavyGlass =
  'border border-[rgba(255,255,255,.35)] [background:linear-gradient(135deg,rgba(255,255,255,.3),rgba(255,255,255,.07)_40%,rgba(255,255,255,.04)_65%,rgba(255,255,255,.16)),radial-gradient(120%_60%_at_0%_0%,rgba(255,255,255,.22),transparent_60%),rgba(var(--fg),.05)] backdrop-blur-[36px] backdrop-saturate-[220%] backdrop-brightness-[1.12] shadow-[inset_0_1.5px_0_rgba(255,255,255,.7),inset_0_-1.5px_0_rgba(255,255,255,.12),inset_0_0_40px_rgba(255,255,255,.08),0_30px_70px_rgba(0,0,0,.35)]'

export const negC = '#f87171'

export function Logo() {
  return (
    <span className="flex items-center gap-3.5">
      <span className="grid grid-cols-[repeat(3,3px)] gap-[3px]">
        {Array.from({ length: 9 }, (_, i) => (
          <span key={i} className="size-[3px] rounded-full bg-(--ink)" />
        ))}
      </span>
      <span className="text-[15px] font-medium">Northline</span>
    </span>
  )
}

function Seg<T extends string>({ value, options, onChange, pad }: { value: T; options: { v: T; n: string }[]; onChange: (v: T) => void; pad: string }) {
  return (
    <span className="flex gap-0.5 rounded-2xl border border-[rgba(var(--fg),.12)] bg-[rgba(var(--fg),.06)] p-[3px]">
      {options.map((o) => (
        <button key={o.v} type="button" onClick={() => onChange(o.v)} className={cn('cursor-pointer rounded-[13px] py-1', pad, o.v === value ? 'bg-(--ink) text-(--paper)' : 'text-(--ink)')}>
          {o.n}
        </button>
      ))}
    </span>
  )
}

export function BareHeader({ onSignOut }: { onSignOut?: () => void }) {
  const { L, mode, setMode, lang, setLang, isMobile, isDesktop } = useShell()
  return (
    <div className={cn('flex flex-none items-center justify-between gap-3', isDesktop ? 'px-10 pt-[26px]' : isMobile ? 'px-4 pt-3.5' : 'px-6 pt-5')}>
      <div className="flex items-center gap-3.5">
        <Logo />
        {!isMobile && (
          <>
            <span className="h-3 w-px bg-[rgba(var(--fg),.4)]" />
            <span className="text-xs whitespace-nowrap opacity-80">{L.ledger}</span>
          </>
        )}
      </div>
      <div className={cn('flex items-center text-xs', isDesktop ? 'gap-[22px]' : isMobile ? 'gap-2' : 'gap-4')}>
        <Seg value={mode} onChange={setMode} pad="px-[11px]" options={[{ v: 'dark', n: lang === 'id' ? 'Gelap' : 'Dark' }, { v: 'light', n: lang === 'id' ? 'Terang' : 'Light' }]} />
        <Seg value={lang} onChange={setLang} pad="px-[9px]" options={[{ v: 'en', n: 'EN' }, { v: 'id', n: 'ID' }]} />
        {onSignOut && (
          <button type="button" onClick={onSignOut} className="cursor-pointer whitespace-nowrap opacity-75 hover:opacity-100">
            {L.signOut}
          </button>
        )}
      </div>
    </div>
  )
}

const footLinks = [
  { id: 'Privasi', en: 'Privacy' },
  { id: 'Ketentuan', en: 'Terms' },
  { id: 'Bantuan', en: 'Help' },
]

export function BareFooter() {
  const { isMobile, isDesktop, showToast } = useShell()
  const t = useT()
  return (
    <div className={cn('flex flex-none justify-between gap-3 text-[11px] opacity-50', isDesktop ? 'px-10 pb-[26px]' : isMobile ? 'px-4 pb-4' : 'px-6 pb-[22px]')}>
      <span>© 2026 Northline</span>
      <span className="flex gap-4">
        {footLinks.map((l) => (
          <button key={l.en} type="button" onClick={() => showToast(t(l))} className="cursor-pointer underline-offset-[3px] hover:underline">
            {t(l)}
          </button>
        ))}
      </span>
    </div>
  )
}

/** Square monogram tile tinted with the workspace colour. */
export function Monogram({ name, color, size }: { name: string; color: string; size: 42 | 46 }) {
  const ini = name
    .split(/\s+/)
    .filter((w) => !/^(PT|CV)$/i.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
  return (
    <span
      className={cn(
        'flex flex-none items-center justify-center border border-[rgba(255,255,255,.25)] font-normal shadow-[inset_0_1px_0_rgba(255,255,255,.35)]',
        size === 42 ? 'size-[42px] rounded-[14px] text-[13px]' : 'size-[46px] rounded-[15px] text-sm',
      )}
      style={{ background: `linear-gradient(135deg, ${color}, ${color}66)` }}
    >
      {ini}
    </span>
  )
}
