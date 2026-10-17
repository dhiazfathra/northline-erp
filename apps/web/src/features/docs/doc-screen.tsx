import type { DocStatus, DocType, NewDocInput } from '@northline/schemas/docs'
import { useQuery } from '@tanstack/react-query'
import { useLocation } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import { docsQuery } from '@/api/docs'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Frame, fmt } from '@/features/ledger/ui'
import type { Lang } from '@/lib/i18n'
import { useShell, useT } from '@/lib/shell'
import { cn } from '@/lib/utils'
import { DocForm } from './doc-form'

type T = Record<Lang, string>

export function partyLabel(t: DocType): T {
  if (t.startsWith('sales')) return { id: 'Pelanggan', en: 'Customer' }
  if (t.startsWith('purchase')) return { id: 'Pemasok', en: 'Vendor' }
  if (t === 'stock-adjustment') return { id: 'Gudang', en: 'Warehouse' }
  return { id: 'Kontak', en: 'Contact' }
}

const statusL: Record<DocStatus, T> = {
  draft: { id: 'Draf', en: 'Draft' },
  approved: { id: 'Disetujui', en: 'Approved' },
  paid: { id: 'Lunas', en: 'Paid' },
  unpaid: { id: 'Belum Lunas', en: 'Unpaid' },
}
const statusBg: Record<DocStatus, string> = {
  draft: 'rgba(var(--fg),.1)',
  approved: 'rgba(56,189,248,.22)',
  paid: 'rgba(34,197,94,.22)',
  unpaid: 'rgba(245,158,11,.22)',
}
const periods = [
  { id: 'cur', n: { id: 'Bulan ini', en: 'This month' }, test: (d: string) => d.endsWith('/10/2026') },
  { id: 'all', n: { id: 'Semua tanggal', en: 'All dates' }, test: () => true },
]

interface Draft {
  id: number
  values: NewDocInput
  edited: boolean
}
// Open forms survive leaving the tab; keyed by doc type.
const drafts: Partial<Record<DocType, { forms: Draft[]; active: number | 'list'; seq: number }>> = {}
const store = (t: DocType) => (drafts[t] ??= { forms: [], active: 'list', seq: 0 })

export function DocScreen({ type }: { type: DocType }) {
  const { L, isMobile, refreshing, setDirty } = useShell()
  const t = useT()
  const { pathname } = useLocation()
  const [forms, setForms] = useState(() => store(type).forms)
  const [active, setActive] = useState(() => store(type).active)
  const party = t(partyLabel(type))

  useEffect(() => {
    Object.assign(store(type), { forms, active })
    setDirty(pathname, forms.some((f) => f.edited))
  }, [type, forms, active, pathname, setDirty])

  const open = () => {
    const id = ++store(type).seq
    setForms((f) => [...f, { id, edited: false, values: { party: '', date: '17/10/2026', autoNo: true, items: [] } }])
    setActive(id)
  }
  const close = (id: number) => {
    setForms((f) => f.filter((x) => x.id !== id))
    setActive('list')
  }
  const edit = useCallback((id: number, values: NewDocInput) => setForms((f) => f.map((x) => (x.id === id ? { ...x, values, edited: true } : x))), [])
  const current = forms.find((f) => f.id === active)

  const subs = (
    <div className="flex gap-1 rounded-[20px] bg-[rgba(var(--fg),.08)] p-1" role="tablist">
      {[{ id: 'list' as const, name: t({ id: 'Daftar', en: 'List' }) }, ...forms.map((f, i) => ({ id: f.id, name: `${L.newEntry} ${forms.length > 1 ? i + 1 : ''}`.trim() }))].map((s) => (
        <span
          key={s.id}
          role="tab"
          tabIndex={0}
          aria-selected={s.id === active}
          onClick={() => setActive(s.id)}
          onKeyDown={(e) => e.key === 'Enter' && setActive(s.id)}
          className={cn('flex cursor-pointer items-center gap-2 rounded-2xl px-3.5 py-2 text-xs', s.id === active ? 'bg-(--ink) text-(--paper)' : 'text-(--ink)')}
        >
          {s.name}
          {s.id !== 'list' && (
            <button
              type="button"
              aria-label={t({ id: 'Tutup', en: 'Close' })}
              className="cursor-pointer text-sm leading-none opacity-60 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation()
                close(s.id)
              }}
            >
              ×
            </button>
          )}
        </span>
      ))}
    </div>
  )

  return (
    <Frame subs={subs}>
      {current ? (
        <DocForm
          key={current.id}
          type={type}
          partyLabel={party}
          values={current.values}
          onEdit={(v) => edit(current.id, v)}
          onDone={() => close(current.id)}
        />
      ) : (
        <DocList type={type} party={party} onNew={open} isMobile={isMobile} refreshing={refreshing} />
      )}
    </Frame>
  )
}

function DocList({ type, party, onNew, isMobile, refreshing }: { type: DocType; party: string; onNew: () => void; isMobile: boolean; refreshing: boolean }) {
  const { L } = useShell()
  const t = useT()
  const { data, isPending } = useQuery(docsQuery(type))
  const [q, setQ] = useState('')
  const [applied, setApplied] = useState('')
  const [period, setPeriod] = useState(periods[0])
  const [status, setStatus] = useState<DocStatus | null>(null)
  const rows = (data ?? []).filter(
    (r) => period.test(r.date) && (!status || r.status === status) && (!applied || `${r.no} ${r.party} ${r.note}`.toLowerCase().includes(applied.toLowerCase())),
  )
  const rowOp = { opacity: refreshing ? 0.35 : 1 }
  const chip = 'flex flex-none cursor-pointer items-center gap-2 rounded-[18px] bg-[rgba(var(--fg),.1)] px-3.5 py-2 text-xs whitespace-nowrap outline-none hover:bg-[rgba(var(--fg),.18)]'
  const chev = (
    <svg width="8" height="5" viewBox="0 0 8 5">
      <path d="M1 1l3 3 3-3" style={{ stroke: 'var(--ink)' }} fill="none" />
    </svg>
  )
  const menu = 'glass-pop min-w-[160px] rounded-2xl p-1.5 text-(--ink)'
  const item = 'cursor-pointer rounded-[10px] px-2.5 py-2 text-[13px] text-(--ink) focus:bg-[rgba(var(--fg),.1)] focus:text-(--ink)'
  const grid = 'grid grid-cols-[1.4fr_1fr_1.6fr_1.4fr_1fr_1fr]'

  return (
    <>
      <div className="mb-3.5 flex flex-wrap items-center gap-2">
        <div className={cn('flex min-w-0 gap-2 overflow-x-auto [scrollbar-width:none]', isMobile ? 'flex-[1_1_100%]' : 'flex-[0_1_auto]')}>
          <DropdownMenu>
            <DropdownMenuTrigger className={chip}>
              {t(period.n)}
              {chev}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className={menu}>
              {periods.map((p) => (
                <DropdownMenuItem key={p.id} className={item} onSelect={() => setPeriod(p)}>
                  {t(p.n)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger className={chip}>
              {status ? t(statusL[status]) : `${L.status}: ${t({ id: 'Semua', en: 'All' })}`}
              {chev}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className={menu}>
              <DropdownMenuItem className={item} onSelect={() => setStatus(null)}>
                {t({ id: 'Semua', en: 'All' })}
              </DropdownMenuItem>
              {(Object.keys(statusL) as DocStatus[]).map((s) => (
                <DropdownMenuItem key={s} className={item} onSelect={() => setStatus(s)}>
                  {t(statusL[s])}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            if (!e.target.value) setApplied('')
          }}
          onKeyDown={(e) => e.key === 'Enter' && setApplied(q)}
          placeholder={t({ id: 'Ketik dan [Enter]', en: 'Type and [Enter]' })}
          aria-label={L.search}
          className={cn('box-border min-w-0 rounded-[18px] border border-[rgba(var(--fg),.18)] bg-[rgba(var(--fg),.06)] px-3.5 py-[9px] text-xs text-(--ink) outline-none', isMobile ? 'ml-0 flex-1' : 'ml-auto w-[240px] flex-none')}
        />
        <button type="button" onClick={onNew} className="flex-none cursor-pointer rounded-[18px] bg-(--ink) px-4 py-[9px] text-xs font-normal text-(--paper)">
          + {L.newEntry}
        </button>
      </div>
      <div className="glass-card overflow-hidden">
        {!isMobile && (
          <div className={cn(grid, 'border-b border-[rgba(var(--fg),.12)] px-[22px] py-[13px] text-[11px] opacity-55')}>
            <span>{L.number}</span>
            <span>{L.date}</span>
            <span>{party}</span>
            <span>{L.notes}</span>
            <span>{L.status}</span>
            <span className="text-right">{L.total}</span>
          </div>
        )}
        {isPending &&
          Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="border-b border-[rgba(var(--fg),.07)] px-[22px] py-[15px]">
              <div className="h-3 rounded-md bg-[linear-gradient(90deg,rgba(var(--fg),.06),rgba(var(--fg),.16),rgba(var(--fg),.06))] bg-[length:200%_100%] animate-[shim_1.2s_linear_infinite]" />
            </div>
          ))}
        {!isPending && rows.length === 0 && <div className="py-10 text-center text-[13px] opacity-50">{L.noData}</div>}
        {rows.map((r) =>
          isMobile ? (
            <div key={r.id} style={rowOp} className="flex items-center gap-3 border-b border-[rgba(var(--fg),.07)] px-4 py-[13px] transition-opacity duration-[.25s] hover:bg-[rgba(var(--fg),.08)]">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px]">{r.party}</div>
                <div className="mt-[3px] truncate text-[11px] tabular-nums opacity-60">
                  {r.no} · {r.date}
                </div>
              </div>
              <div className="flex flex-none flex-col items-end gap-1.5">
                <span className="text-[13px] tabular-nums">{fmt(r.total)}</span>
                <span className="rounded-xl px-[9px] py-1 text-[10.5px]" style={{ background: statusBg[r.status] }}>
                  {t(statusL[r.status])}
                </span>
              </div>
            </div>
          ) : (
            <div key={r.id} style={rowOp} className={cn(grid, 'items-center border-b border-[rgba(var(--fg),.07)] px-[22px] py-3 text-[13px] transition-opacity duration-[.25s] hover:bg-[rgba(var(--fg),.08)]')}>
              <span className="tabular-nums">{r.no}</span>
              <span className="opacity-75">{r.date}</span>
              <span>{r.party}</span>
              <span className="opacity-50">{r.note}</span>
              <span>
                <span className="rounded-xl px-2.5 py-[5px] text-[11px]" style={{ background: statusBg[r.status] }}>
                  {t(statusL[r.status])}
                </span>
              </span>
              <span className="text-right tabular-nums">{fmt(r.total)}</span>
            </div>
          ),
        )}
      </div>
    </>
  )
}
