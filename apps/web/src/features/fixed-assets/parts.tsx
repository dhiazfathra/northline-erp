import { Link } from '@tanstack/react-router'
import { useState, type ReactNode } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useShell, useT } from '@/lib/shell'
import { cn } from '@/lib/utils'

export const fmtIdr = (n: number) => Math.round(n).toLocaleString('en-US')
export const parseNum = (s: string) => Number(s.replace(/\D/g, '')) || 0
/** ISO yyyy-mm-dd → dd/mm/yyyy */
export const fmtDate = (iso: string) => (iso ? iso.split('-').reverse().join('/') : '')

/** The design's menu panel ({{ panel }} + blur, .16 border, flat shadow) — plainer than glass-pop. */
export const menuPanel = 'border border-[rgba(var(--fg),.16)] bg-(--panel) shadow-[0_24px_60px_rgba(0,0,0,.3)] backdrop-blur-[28px] backdrop-saturate-[1.8]'

export const tx = {
  mod: { id: 'Aset Tetap', en: 'Fixed Assets' },
  list: { id: 'Daftar Aset', en: 'Asset List' },
  title: { id: 'Aset Tetap', en: 'Fixed Assets' },
}

/** Doc header of the `isDoc` frame: module eyebrow, title and segmented sub-tabs. */
export function DocHeader({ label, current, onClose, children }: { label: string; current?: string; onClose?: () => void; children: ReactNode }) {
  const t = useT()
  const { isMobile } = useShell()
  const seg = 'flex items-center gap-2 rounded-[16px] px-[14px] py-2 text-[12px] cursor-pointer'
  return (
    <div className={cn('flex-none animate-[fade_.25s] pt-5 pb-8', isMobile ? 'px-4' : 'px-10 max-[1099px]:px-6')}>
      <div className="mb-[18px] flex flex-wrap items-end justify-between gap-[14px]">
        <div>
          <div className="text-[11px] tracking-[.5px] uppercase opacity-60">{t(tx.mod)}</div>
          <div className={cn('mt-1 tracking-[-.3px]', isMobile ? 'text-[24px]' : 'text-[30px]')}>{label}</div>
        </div>
        <div className="flex gap-1 rounded-[20px] bg-[rgba(var(--fg),.08)] p-1">
          <Link to="/fixed-assets" className={cn(seg, !current && 'bg-(--ink) text-(--paper)')}>
            {t(tx.list)}
          </Link>
          {current && (
            <span className={cn(seg, 'bg-(--ink) text-(--paper)')}>
              {current}
              <span role="button" aria-label="Close" className="text-[14px] leading-none opacity-60 hover:opacity-100" onClick={onClose}>
                ×
              </span>
            </span>
          )}
        </div>
      </div>
      {children}
    </div>
  )
}

const wdId = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
const wdEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const TODAY = '2026-10-17'

/** Date field with day / month / year views (the design's `x.dp`). Value is ISO yyyy-mm-dd. */
export function DatePicker({ value, onChange, invalid, id }: { value: string; onChange: (v: string) => void; invalid?: boolean; id?: string }) {
  const { lang } = useShell()
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<'d' | 'm' | 'y'>('d')
  const sel = value ? new Date(`${value}T00:00`) : null
  const [cur, setCur] = useState(() => sel ?? new Date(`${TODAY}T00:00`))
  const y = cur.getFullYear()
  const m = cur.getMonth()
  const loc = lang === 'id' ? 'id-ID' : 'en-GB'
  const monthName = (i: number, f: 'long' | 'short') => new Date(2026, i, 1).toLocaleDateString(loc, { month: f })
  const pick = (v: string) => {
    onChange(v)
    setOpen(false)
  }
  const shift = (n: number) => setCur(view === 'd' ? new Date(y, m + n, 1) : new Date(y + n * (view === 'm' ? 1 : 12), m, 1))
  const y0 = y - (y % 12)
  const first = new Date(y, m, 1).getDay()
  const cells = Array.from({ length: 42 }, (_, i) => new Date(y, m, i - first + 1))
  const ring = 'shadow-[inset_0_0_0_1px_#ec4899]'
  const on = 'bg-[#ec4899] text-white font-normal'
  const ref = sel ?? new Date(`${TODAY}T00:00`)

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o) {
          setView('d')
          setCur(ref)
        }
      }}
    >
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          aria-invalid={invalid || undefined}
          className={cn(
            'flex h-[41px] w-full cursor-pointer items-center gap-2.5 rounded-[14px] border border-[rgba(var(--fg),.18)] bg-[rgba(var(--fg),.06)] px-[14px] text-left text-[13px] transition-[border-color,box-shadow] duration-150 hover:bg-[rgba(var(--fg),.09)]',
            open && 'border-[#ec4899] shadow-[0_0_0_3px_rgba(236,72,153,.18)]',
            invalid && 'border-[#f472b6]',
          )}
        >
          <i className="ph-light ph-calendar-blank text-[16px] opacity-75" />
          <span className={cn('min-w-0 flex-1 truncate tabular-nums', !value && 'opacity-50')}>{value ? fmtDate(value) : 'dd/mm/yyyy'}</span>
          <i className={cn('ph-light ph-caret-down text-[12px] opacity-60 transition-transform duration-200', open && 'rotate-180')} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[300px] rounded-[22px] border border-[rgba(var(--fg),.18)] p-4 text-(--ink) shadow-[inset_0_1px_0_rgba(255,255,255,.22),0_24px_60px_rgba(0,0,0,.32),0_2px_8px_rgba(0,0,0,.12)] backdrop-blur-[28px] backdrop-saturate-200 [background:linear-gradient(160deg,rgba(var(--fg),.10),rgba(var(--fg),.02)_45%,rgba(var(--fg),.06)),var(--panel)]"
      >
        <div className="mb-2.5 flex flex-col gap-0.5 border-b border-[rgba(var(--fg),.1)] px-1.5 pb-[14px]">
          <span className="text-[10.5px] tracking-[.14em] text-[#ec4899] uppercase">{ref.toLocaleDateString(loc, { weekday: 'long' })}</span>
          <span className="text-[26px] font-extralight tracking-[-.01em] tabular-nums">{ref.toLocaleDateString(loc, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </div>
        <div className="mb-2 flex items-center gap-0.5">
          <span onClick={() => setView(view === 'd' ? 'm' : 'y')} className="flex flex-1 cursor-pointer items-center gap-1.5 rounded-[10px] px-2 py-1.5 text-[14px] font-normal tabular-nums hover:bg-[rgba(var(--fg),.08)]">
            {view === 'd' ? `${monthName(m, 'long')} ${y}` : view === 'm' ? y : `${y0} – ${y0 + 11}`}
            <i className="ph-light ph-caret-down text-[11px] opacity-55" />
          </span>
          {[-1, 1].map((n) => (
            <span key={n} onClick={() => shift(n)} className="flex size-[30px] flex-none cursor-pointer items-center justify-center rounded-full text-[14px] hover:bg-[rgba(var(--fg),.1)]">
              <i className={n < 0 ? 'ph-light ph-caret-left' : 'ph-light ph-caret-right'} />
            </span>
          ))}
        </div>
        {view === 'd' && (
          <>
            <div className="grid grid-cols-7 pt-0.5 pb-1.5 text-center text-[10.5px] opacity-50">
              {(lang === 'id' ? wdId : wdEn).map((w) => (
                <span key={w}>{w}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-y-0.5">
              {cells.map((d) => {
                const v = iso(d)
                return (
                  <span key={v} onClick={() => pick(v)} className="flex h-[38px] cursor-pointer items-center justify-center rounded-full hover:bg-[rgba(var(--fg),.09)]">
                    <span className={cn('flex size-[34px] items-center justify-center rounded-full text-[12.5px] tabular-nums', d.getMonth() !== m && 'opacity-35', v === TODAY && ring, v === value && on)}>{d.getDate()}</span>
                  </span>
                )
              })}
            </div>
          </>
        )}
        {view !== 'd' && (
          <div className="grid grid-cols-3 gap-1.5">
            {Array.from({ length: 12 }, (_, i) => {
              const active = view === 'm' ? sel?.getFullYear() === y && sel.getMonth() === i : sel?.getFullYear() === y0 + i
              const now = view === 'm' ? y === 2026 && i === 9 : y0 + i === 2026
              return (
                <span
                  key={i}
                  onClick={() => {
                    setCur(view === 'm' ? new Date(y, i, 1) : new Date(y0 + i, m, 1))
                    setView(view === 'm' ? 'd' : 'm')
                  }}
                  className={cn('cursor-pointer rounded-[14px] py-[13px] text-center text-[13px] tabular-nums hover:-translate-y-px', now && ring, active && on)}
                >
                  {view === 'm' ? monthName(i, 'short') : y0 + i}
                </span>
              )
            })}
          </div>
        )}
        <div className="mt-3 flex items-center gap-1.5 border-t border-[rgba(var(--fg),.1)] pt-3">
          {[
            { n: lang === 'id' ? 'Hari ini' : 'Today', v: TODAY },
            { n: lang === 'id' ? 'Awal bulan' : 'Month start', v: '2026-10-01' },
          ].map((q) => (
            <span key={q.v} onClick={() => pick(q.v)} className="cursor-pointer rounded-[14px] border border-[rgba(var(--fg),.18)] px-3 py-1.5 text-[11.5px] hover:bg-[rgba(var(--fg),.1)]">
              {q.n}
            </span>
          ))}
          <span onClick={() => pick('')} className="ml-auto cursor-pointer px-2 py-1.5 text-[11.5px] opacity-60 hover:text-[#ec4899] hover:opacity-100">
            {lang === 'id' ? 'Hapus' : 'Clear'}
          </span>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export interface PickOpt {
  v: string
  n: string
  c?: string
  t?: string
}

/** Searchable chip picker (the design's account / category / location picks). */
export function Picker({
  label,
  req,
  ph,
  opts,
  value,
  onPick,
  ro,
  invalid,
  chipless,
}: {
  label: string
  req?: boolean
  ph: string
  opts: PickOpt[]
  value?: string
  onPick: (v: string) => void
  ro?: boolean
  invalid?: boolean
  /** Expense pick: never shows a chip, just adds. */
  chipless?: boolean
}) {
  const { lang } = useShell()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const cur = opts.find((o) => o.v === value)
  const shown = opts.filter((o) => `${o.n} ${o.c ?? ''}`.toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="flex flex-col gap-1.5 text-[11px]">
      <span className="opacity-75">
        {label}
        {req && <span className="text-[#ec4899]"> *</span>}
      </span>
      <Popover
        open={open}
        onOpenChange={(o) => {
          setOpen(o && !ro)
          setQ('')
        }}
      >
        <PopoverTrigger asChild>
          <div
            role="button"
            aria-invalid={invalid || undefined}
            className={cn(
              'flex min-h-[43px] items-center gap-2 rounded-[14px] border border-[rgba(var(--fg),.18)] py-1.5 pr-3 pl-1.5 text-[13px]',
              ro ? 'cursor-default bg-[rgba(var(--fg),.03)]' : 'cursor-pointer bg-[rgba(var(--fg),.06)]',
              invalid && 'border-[#f472b6]',
            )}
          >
            {cur && !chipless ? (
              <span className="flex min-w-0 items-center gap-1.5 rounded-[10px] bg-[rgba(var(--fg),.1)] py-[5px] pr-1.5 pl-2.5 text-[12px]">
                <span className="truncate">{cur.c ? `${cur.c} ${cur.n}` : cur.n}</span>
                {!ro && (
                  <span
                    className="flex size-[18px] flex-none items-center justify-center rounded-full text-[14px] leading-none opacity-60 hover:bg-[rgba(var(--fg),.15)] hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation()
                      onPick('')
                    }}
                  >
                    ×
                  </span>
                )}
              </span>
            ) : (
              <span className="truncate pl-2 opacity-50">{ph}</span>
            )}
            <span className="flex-1" />
            <i className="ph-light ph-magnifying-glass flex-none text-[16px] opacity-60" />
          </div>
        </PopoverTrigger>
        <PopoverContent align="start" className={cn(menuPanel, 'w-(--radix-popover-trigger-width)', 'rounded-[18px] p-2 text-(--ink)')}>
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={ph} className="field w-full rounded-[12px] px-3 py-[9px] text-[12.5px] outline-none" />
          <div className="mt-1.5 max-h-[236px] overflow-y-auto">
            {shown.map((o) => (
              <div
                key={o.v}
                onClick={() => {
                  onPick(o.v)
                  setOpen(false)
                }}
                className={cn('cursor-pointer rounded-[10px] px-2.5 py-[9px] hover:bg-[rgba(var(--fg),.1)]', o.v === value && !chipless && 'bg-[rgba(var(--fg),.12)]')}
              >
                <div className="text-[13px]">{o.n}</div>
                {o.c && (
                  <div className="mt-[3px] flex justify-between gap-2.5 text-[11px] opacity-60">
                    <span className="tabular-nums">{o.c}</span>
                    <span className="italic">{o.t}</span>
                  </div>
                )}
              </div>
            ))}
            {!shown.length && <div className="px-2.5 py-[14px] text-center text-[12px] opacity-50">{lang === 'id' ? 'Tidak ada hasil' : 'No results'}</div>}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

/** The design's square check (20px, radius 6). */
export function Check({ checked, onChange, ro, label }: { checked: boolean; onChange: (v: boolean) => void; ro?: boolean; label: string }) {
  return (
    <label className={cn('flex w-max items-center gap-2.5 text-[13px]', ro ? 'cursor-default' : 'cursor-pointer')}>
      <Checkbox
        checked={checked}
        disabled={ro}
        onCheckedChange={(v) => onChange(v === true)}
        className="size-5 rounded-[6px] border-[rgba(var(--fg),.35)] bg-transparent text-(--paper) disabled:cursor-default disabled:opacity-100 data-checked:border-[rgba(var(--fg),.35)] data-checked:bg-(--ink) data-checked:text-(--paper) dark:bg-transparent dark:data-checked:bg-(--ink) [&_svg]:size-3"
      />
      {label}
    </label>
  )
}
