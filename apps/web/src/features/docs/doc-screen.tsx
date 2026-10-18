import type { DocRow, DocStatus, DocType, DocValues, ItemDocInput, JournalDocInput, PaymentDocInput } from '@northline/schemas/docs'
import { idr } from '@northline/schemas/fixtures'
import { useQuery } from '@tanstack/react-query'
import { useLocation } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { PaidInvoiceError, docMeta, docsQuery, nextNumber, useDeleteDoc } from '@/api/docs'
import { Confirm, ConfirmAction, ConfirmCancel, Frame, btnOutline } from '@/features/ledger/ui'
import type { Lang } from '@/lib/i18n'
import { navFor } from '@/lib/nav'
import { useShell, useT } from '@/lib/shell'
import { cn } from '@/lib/utils'
import { ItemForm } from './item-form'
import { JournalForm } from './journal-form'
import { PaymentForm } from './payment-form'
import { Problems } from './shell'

type T = Record<Lang, string>
const PAGE = 20

export function partyLabel(t: DocType): T {
  if (t === 'sales-return' || t === 'purchase-return') return { id: 'Retur dari', en: 'Returned from' }
  if (t.startsWith('sales')) return { id: 'Pelanggan', en: 'Customer' }
  if (t.startsWith('purchase')) return { id: 'Pemasok', en: 'Vendor' }
  if (t === 'stock-adjustment') return { id: 'Gudang', en: 'Warehouse' }
  return { id: 'Kontak', en: 'Contact' }
}

const statusL: Record<DocStatus, T & { icon: string; rgb: string }> = {
  unpaid: { id: 'Belum Lunas', en: 'Unpaid', icon: 'ph-light ph-circle-dashed', rgb: '245,158,11' },
  partial: { id: 'Terbayar Sebagian', en: 'Partly Paid', icon: 'ph-light ph-circle-half', rgb: '56,189,248' },
  paid: { id: 'Lunas', en: 'Paid', icon: 'ph-light ph-check-circle', rgb: '34,197,94' },
}

function blank(type: DocType): DocValues {
  const head = { date: '17/10/2026', autoNo: true, number: nextNumber(docMeta[type].prefix), description: '' }
  const kind = docMeta[type].kind
  if (kind === 'journal') return { ...head, lines: [] }
  if (kind === 'payment') return { ...head, party: '', bank: '1101 Bank Uji', amount: 0, lines: [] }
  return { ...head, party: '', items: [], discPct: 0, taxable: false, inclusive: false, terms: 'Net 30', poNo: '', supplierNo: '', dp: [], invoice: '' }
}

/** Values to open a record with; Jurnal Umum always shows the journal lines. */
function valuesOf(type: DocType, r: DocRow): DocValues {
  if (type === 'journal') return { date: r.date, autoNo: true, number: r.jv, description: r.description, lines: r.lines.map((l) => ({ ...l, memo: l.memo ?? '' })) }
  return r.values ?? { ...blank(type), date: r.date, number: r.no, description: r.description }
}

interface Draft {
  id: number
  record?: DocRow
  title: string
  values: DocValues
  edited: boolean
}
interface TabState {
  forms: Draft[]
  active: number | 'list'
  seq: number
  q: string
  applied: string
  status: DocStatus | null
}
// Open forms and the search survive leaving the tab; keyed by doc type.
const store: Partial<Record<DocType, TabState>> = {}
const stateOf = (t: DocType) => (store[t] ??= { forms: [], active: 'list', seq: 0, q: '', applied: '', status: null })

export function DocScreen({ type }: { type: DocType }) {
  const { L, setDirty, showToast } = useShell()
  const t = useT()
  const { pathname } = useLocation()
  const docLabel = t(navFor(pathname)?.sub.label ?? { id: '', en: '' })
  const [forms, setForms] = useState(() => stateOf(type).forms)
  const [active, setActive] = useState(() => stateOf(type).active)
  const [problems, setProblems] = useState<string[]>([])
  const [del, setDel] = useState<{ draft: Draft; no: string } | null>(null)
  const remove = useDeleteDoc()
  const party = t(partyLabel(type))

  useEffect(() => {
    Object.assign(stateOf(type), { forms, active })
    setDirty(pathname, forms.some((f) => f.edited))
  }, [type, forms, active, pathname, setDirty])

  const open = (record?: DocRow) => {
    const found = record && forms.find((f) => f.record?.id === record.id)
    if (found) return setActive(found.id)
    const id = ++stateOf(type).seq
    const title = record ? (type === 'journal' ? record.jv : record.no) : L.newEntry
    setForms((f) => [...f, { id, record, title, edited: false, values: record ? valuesOf(type, record) : blank(type) }])
    setActive(id)
  }
  const close = (id: number) => {
    setForms((f) => f.filter((x) => x.id !== id))
    setActive('list')
  }
  const edit = useCallback((id: number, values: DocValues) => setForms((f) => f.map((x) => (x.id === id ? { ...x, values, edited: true } : x))), [])
  const current = forms.find((f) => f.id === active)

  const confirmDelete = () => {
    if (!del) return
    const { draft, no } = del
    setDel(null)
    if (!draft.record) return close(draft.id)
    remove.mutate(draft.record.id, {
      onSuccess: () => {
        showToast(`${docLabel} "${no}" berhasil dihapus`)
        close(draft.id)
      },
      onError: (e) => setProblems([e instanceof PaidInvoiceError ? `Tidak dapat menghapus faktur ${no} karena sudah ada pembayarannya` : String(e)]),
    })
  }

  const subs = (
    <div className="flex max-w-full gap-1 overflow-x-auto rounded-[20px] bg-[rgba(var(--fg),.08)] p-1 [scrollbar-width:none]" role="tablist">
      {[{ id: 'list' as const, title: t({ id: 'Daftar', en: 'List' }) }, ...forms].map((s) => (
        <span
          key={s.id}
          role="tab"
          tabIndex={0}
          aria-selected={s.id === active}
          onClick={() => setActive(s.id)}
          onKeyDown={(e) => e.key === 'Enter' && setActive(s.id)}
          className={cn('flex flex-none cursor-pointer items-center gap-2 rounded-2xl px-3.5 py-2 text-xs whitespace-nowrap', s.id === active ? 'bg-(--ink) text-(--paper)' : 'text-(--ink)')}
        >
          {s.title}
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

  const form = (() => {
    if (!current) return null
    const common = {
      type,
      docLabel,
      record: current.record,
      dirty: current.edited,
      onSaved: () => close(current.id),
      onClose: () => close(current.id),
      onDelete: (no: string) => setDel({ draft: current, no }),
      report: setProblems,
    }
    const kind = type === 'journal' ? 'journal' : docMeta[type].kind
    if (kind === 'journal') return <JournalForm key={current.id} {...common} values={current.values as JournalDocInput} onEdit={(v) => edit(current.id, v)} />
    if (kind === 'payment') return <PaymentForm key={current.id} {...common} partyLabel={party} values={current.values as PaymentDocInput} onEdit={(v) => edit(current.id, v)} />
    return <ItemForm key={current.id} {...common} partyLabel={party} values={current.values as ItemDocInput} onEdit={(v) => edit(current.id, v)} />
  })()

  return (
    <Frame subs={subs}>
      {form ?? <DocList type={type} party={party} onNew={() => open()} onOpen={open} />}
      <Problems items={problems} onClose={() => setProblems([])} />
      <Confirm
        open={!!del}
        onOpenChange={(o) => !o && setDel(null)}
        icon={<i className="ph-light ph-trash text-[20px] text-[#ef4444]" />}
        title={t({ id: 'Konfirmasi', en: 'Confirm' })}
        actions={
          <>
            <ConfirmCancel className={btnOutline}>{t({ id: 'Tidak', en: 'No' })}</ConfirmCancel>
            <ConfirmAction className={cn(btnOutline, 'border-none bg-[#dc2626] text-white')} onClick={confirmDelete}>
              {t({ id: 'Ya, hapus', en: 'Yes, delete' })}
            </ConfirmAction>
          </>
        }
      >
        Apakah Anda yakin akan melakukan penghapusan data: {del?.no}
      </Confirm>
    </Frame>
  )
}

function DocList({ type, party, onNew, onOpen }: { type: DocType; party: string; onNew: () => void; onOpen: (r: DocRow) => void }) {
  const { L, isMobile, refreshing } = useShell()
  const t = useT()
  const { data, isPending } = useQuery(docsQuery(type))
  const st = stateOf(type)
  const [q, setQ] = useState(st.q)
  const [applied, setApplied] = useState(st.applied)
  const [status, setStatus] = useState(st.status)
  const [shown, setShown] = useState(PAGE)
  const end = useRef<HTMLDivElement>(null)
  const isJournal = type === 'journal'
  const hasStatus = !isJournal && (data ?? []).some((r) => r.status)

  useEffect(() => {
    Object.assign(stateOf(type), { q, applied, status })
  }, [type, q, applied, status])

  const rows = (data ?? []).filter(
    (r) => (!status || r.status === status) && (!applied || `${r.no} ${r.jv} ${r.party} ${r.description} ${r.source}`.toLowerCase().includes(applied.toLowerCase())),
  )
  const more = rows.length > shown

  // Infinite scroll: load the next page once the list end is visible.
  useEffect(() => {
    const el = end.current
    if (!el || !more) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setShown((n) => n + PAGE))
    io.observe(el)
    return () => io.disconnect()
  }, [more, shown])

  const rowOp = { opacity: refreshing ? 0.35 : 1 }
  const grid = 'grid grid-cols-[minmax(0,1.3fr)_minmax(0,.9fr)_minmax(0,1.6fr)_minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3'
  const badge = (r: DocRow) => {
    if (isJournal)
      return r.source !== 'Jurnal Umum' ? (
        <span className="inline-flex items-center gap-1 rounded-xl border border-[rgba(var(--fg),.25)] px-2 py-[3px] text-[10.5px] whitespace-nowrap">
          <i className="ph-light ph-gear-six" />
          {r.source}
        </span>
      ) : null
    if (!r.status) return null
    const s = statusL[r.status]
    return (
      <span className={cn('inline-flex items-center gap-[5px] self-start rounded-xl border py-[3px] whitespace-nowrap', isMobile ? 'px-[9px] text-[10.5px]' : 'px-2.5 text-[11.5px]')} style={{ borderColor: `rgba(${s.rgb},.7)`, background: `rgba(${s.rgb},.12)` }}>
        <i className={s.icon} aria-hidden="true" />
        {t(s)}
      </span>
    )
  }

  return (
    <>
      <div className="mb-3.5 flex flex-wrap items-center gap-2">
        {hasStatus && (
          <div className="flex min-w-0 gap-2 overflow-x-auto [scrollbar-width:none]">
            {[null, ...(Object.keys(statusL) as DocStatus[])].map((s) => (
              <button
                key={s ?? 'all'}
                type="button"
                onClick={() => setStatus(s)}
                aria-pressed={status === s}
                className={cn('flex-none cursor-pointer rounded-[18px] border px-3.5 py-2 text-xs leading-[1.25] whitespace-nowrap transition-[border-color,background] duration-150', status === s ? 'border-transparent bg-(--ink) text-(--paper)' : 'border-[rgba(var(--fg),.18)] hover:bg-[rgba(var(--fg),.08)]')}
              >
                {s ? t(statusL[s]) : t({ id: 'Semua', en: 'All' })}
              </button>
            ))}
          </div>
        )}
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            if (!e.target.value) setApplied('')
          }}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            setApplied(q)
            setShown(PAGE)
          }}
          placeholder={t({ id: 'Ketik dan [Enter]', en: 'Type and [Enter]' })}
          aria-label={L.search}
          className={cn('box-border min-w-0 rounded-[18px] border border-[rgba(var(--fg),.18)] bg-[rgba(var(--fg),.06)] px-3.5 py-[9px] text-xs text-(--ink) outline-none', isMobile ? 'flex-1' : 'max-w-[360px] flex-[1_1_220px]')}
        />
        <button type="button" onClick={onNew} className="ml-auto flex-none cursor-pointer rounded-[18px] bg-(--ink) px-4 py-[9px] text-xs font-normal text-(--paper)">
          + {L.newEntry}
        </button>
      </div>
      <div className="glass-card overflow-hidden">
        <div className={cn('border-b border-[rgba(var(--fg),.12)] px-[22px] py-[13px] text-[11px]', !isMobile && grid)}>
          {isMobile ? (
            <span className="opacity-55">{t({ id: `${rows.length} data`, en: `${rows.length} records` })}</span>
          ) : (
            <>
              <span className="opacity-55">
                {L.number} <span className="ml-1 rounded-lg bg-[rgba(var(--fg),.12)] px-1.5 py-px">{rows.length}</span>
              </span>
              <span className="opacity-55">{L.date}</span>
              <span className="opacity-55">{isJournal ? L.notes : party}</span>
              <span className="opacity-55">{isJournal ? t({ id: 'No. Sumber', en: 'Source No.' }) : L.notes}</span>
              <span className="opacity-55">{isJournal ? t({ id: 'Tipe', en: 'Type' }) : hasStatus ? L.status : ''}</span>
              <span className="text-right opacity-55">{L.total}</span>
            </>
          )}
        </div>
        {isPending &&
          Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="border-b border-[rgba(var(--fg),.07)] px-[22px] py-[15px]">
              <div className="h-2.5 animate-[shim_1.4s_linear_infinite] rounded-full bg-[linear-gradient(90deg,rgba(var(--fg),.06),rgba(var(--fg),.16),rgba(var(--fg),.06))] bg-[length:300%_100%]" />
            </div>
          ))}
        {!isPending && rows.length === 0 && (
          <div className="py-12 text-center text-[13px] opacity-50">{applied ? t({ id: 'Tidak ada data yang cocok', en: 'No matching records' }) : L.noData}</div>
        )}
        {rows.slice(0, shown).map((r) => {
          const no = isJournal ? r.jv : r.no
          return isMobile ? (
            <button
              key={r.id}
              data-rf-row
              type="button"
              onClick={() => onOpen(r)}
              style={rowOp}
              className="flex w-full cursor-pointer items-center gap-3 border-b border-[rgba(var(--fg),.07)] px-4 py-[13px] text-left transition-opacity duration-[.25s] hover:bg-[rgba(var(--fg),.08)]"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px]">{isJournal ? r.description : r.party || r.description}</div>
                <div className="mt-[3px] truncate text-[11px] tabular-nums opacity-60">
                  {no} · {r.date}
                </div>
              </div>
              <div className="flex flex-none flex-col items-end gap-1.5">
                <span className="text-[13px] tabular-nums">{idr(r.total)}</span>
                {badge(r)}
              </div>
            </button>
          ) : (
            <button
              key={r.id}
              data-rf-row
              type="button"
              onClick={() => onOpen(r)}
              style={rowOp}
              className={cn(grid, 'w-full cursor-pointer items-center border-b border-[rgba(var(--fg),.07)] px-[22px] py-3 text-left text-[13px] transition-opacity duration-[.25s] hover:bg-[rgba(var(--fg),.08)]')}
            >
              <span className="truncate tabular-nums">{no}</span>
              <span className="tabular-nums">{r.date}</span>
              <span className="truncate">{isJournal ? r.description : r.party}</span>
              <span className="truncate">{isJournal ? (r.no !== r.jv ? r.no : '') : r.description}</span>
              <span>{badge(r)}</span>
              <span className="text-right tabular-nums">{idr(r.total)}</span>
            </button>
          )
        })}
        {more && (
          <div ref={end} className="flex justify-center py-3.5">
            <button type="button" onClick={() => setShown((n) => n + PAGE)} className={btnOutline}>
              {t({ id: 'Muat 20 berikutnya', en: 'Load next 20' })}
            </button>
          </div>
        )}
      </div>
    </>
  )
}
