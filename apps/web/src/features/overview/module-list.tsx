import type { DrawerRecord, ListRow } from '@northline/schemas/overview'
import { useState } from 'react'
import { useModuleList } from '@/api/overview'
import { Skeleton } from '@/components/ui/skeleton'
import { navFor } from '@/lib/nav'
import { useShell, useT } from '@/lib/shell'
import { cn } from '@/lib/utils'
import { RecordDrawer } from './drawer'
import { NewTxModal } from './new-tx-modal'

type Filter = 'all' | ListRow['status']
const filters: { k: Filter; name: { id: string; en: string } }[] = [
  { k: 'all', name: { id: 'Semua', en: 'All' } },
  { k: 'active', name: { id: 'Aktif', en: 'Active' } },
  { k: 'overdue', name: { id: 'Jatuh tempo', en: 'Overdue' } },
  { k: 'inactive', name: { id: 'Nonaktif', en: 'Inactive' } },
]
const status: Record<ListRow['status'], { name: { id: string; en: string }; bg: string }> = {
  active: { name: filters[1].name, bg: 'rgba(var(--fg),.08)' },
  overdue: { name: filters[2].name, bg: 'rgba(239,68,68,.16)' },
  inactive: { name: filters[3].name, bg: 'rgba(var(--fg),.08)' },
}
const initials = (s: string) =>
  s
    .replace(/^(PT|CV|UD)\s+/, '')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
const balHead: Record<string, { id: string; en: string }> = { items: { id: 'Sisa Stok', en: 'Stock on hand' }, taxes: { id: 'Tarif', en: 'Rate' } }
const COLS = 'grid-cols-[2fr_1.4fr_1fr_1fr_40px]'

export function ModuleList({ moduleId }: { moduleId: string }) {
  const { L, isMobile, refreshing } = useShell()
  const t = useT()
  const { data: rows, isPending } = useModuleList(moduleId)
  const [filter, setFilter] = useState<Filter>('all')
  const [drawer, setDrawer] = useState<DrawerRecord | null>(null)
  const [modal, setModal] = useState(false)
  const kind = navFor(`/modules/${moduleId}`)?.sub.label ?? { id: 'Data', en: 'Record' }
  const shown = rows?.filter((r) => filter === 'all' || r.status === filter) ?? []
  const open = (r: ListRow) =>
    setDrawer({
      kind,
      title: r.name,
      value: r.bal,
      note: { id: `${r.id} · ${status[r.status].name.id}`, en: `${r.id} · ${status[r.status].name.en}` },
      lines: [
        { a: { id: 'Kode', en: 'Code' }, b: r.id },
        { a: { id: 'Kontak', en: 'Contact' }, b: r.contact },
        { a: balHead[moduleId] ?? { id: 'Saldo', en: 'Balance' }, b: r.bal },
        { a: { id: 'Status', en: 'Status' }, b: t(status[r.status].name) },
      ],
      cta: { id: 'Buka detail', en: 'Open details' },
    })
  const rowStyle = { opacity: refreshing ? 0.35 : 1 }

  return (
    <div className={cn('flex-none animate-[fade_.25s] pt-[24px] pb-[32px]', isMobile ? 'px-[16px]' : 'px-[40px]')}>
      <div className="mb-[18px] flex flex-wrap items-center gap-[10px]">
        {filters.map((f) => (
          <button
            key={f.k}
            type="button"
            className={cn('cursor-pointer rounded-[18px] px-[14px] py-[8px] text-[12px]', f.k === filter ? 'bg-(--ink) text-(--paper)' : 'bg-[rgba(var(--fg),.08)]')}
            onClick={() => setFilter(f.k)}
          >
            {t(f.name)}
          </button>
        ))}
        <button type="button" className="ml-auto cursor-pointer rounded-[18px] bg-(--ink) px-[16px] py-[9px] text-[12px] font-normal text-(--paper)" onClick={() => setModal(true)}>
          + {L.newEntry}
        </button>
      </div>
      <div className="glass-card overflow-hidden">
        {!isMobile && (
          <div className={cn('grid border-b border-[rgba(var(--fg),.12)] px-[22px] py-[14px] text-[11px] opacity-55', COLS)}>
            <span>{L.name}</span>
            <span>{L.contact}</span>
            <span>{balHead[moduleId] ? t(balHead[moduleId]) : L.balance}</span>
            <span>{L.status}</span>
            <span />
          </div>
        )}
        {isPending &&
          [0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="border-b border-[rgba(var(--fg),.07)] px-[22px] py-[15px]">
              <Skeleton className="h-[28px] rounded-[14px] bg-[rgba(var(--fg),.07)]" />
            </div>
          ))}
        {!isPending && shown.length === 0 && <div className="py-[48px] text-center text-[13px] opacity-55">{L.noData}</div>}
        {shown.map((r) =>
          isMobile ? (
            <button
              key={r.id}
              type="button"
              data-rf-row="1"
              style={rowStyle}
              className="flex w-full cursor-pointer items-center gap-[12px] border-b border-[rgba(var(--fg),.07)] px-[16px] py-[14px] text-left transition-opacity duration-250 hover:bg-[rgba(var(--fg),.08)]"
              onClick={() => open(r)}
            >
              <span className="flex size-[32px] flex-none items-center justify-center rounded-full bg-[rgba(var(--fg),.14)] text-[11px]">{initials(r.name)}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px]">{r.name}</div>
                <div className="mt-[3px] truncate text-[11.5px] opacity-60">{r.contact}</div>
              </div>
              <div className="flex flex-none flex-col items-end gap-[6px]">
                <span className="text-[13px]">{r.bal}</span>
                <span className="rounded-[12px] px-[9px] py-[4px] text-[10.5px]" style={{ background: status[r.status].bg }}>
                  {t(status[r.status].name)}
                </span>
              </div>
            </button>
          ) : (
            <button
              key={r.id}
              type="button"
              data-rf-row="1"
              style={rowStyle}
              className={cn('grid w-full cursor-pointer items-center border-b border-[rgba(var(--fg),.07)] px-[22px] py-[15px] text-left text-[13px] transition-opacity duration-250 hover:bg-[rgba(var(--fg),.08)]', COLS)}
              onClick={() => open(r)}
            >
              <span className="flex items-center gap-[12px]">
                <span className="flex size-[28px] flex-none items-center justify-center rounded-full bg-[rgba(var(--fg),.14)] text-[10.5px]">{initials(r.name)}</span>
                {r.name}
              </span>
              <span className="opacity-75">{r.contact}</span>
              <span>{r.bal}</span>
              <span>
                <span className="rounded-[12px] px-[10px] py-[5px] text-[11px]" style={{ background: status[r.status].bg }}>
                  {t(status[r.status].name)}
                </span>
              </span>
              <span className="opacity-60">›</span>
            </button>
          ),
        )}
      </div>
      <RecordDrawer record={drawer} onClose={() => setDrawer(null)} />
      <NewTxModal open={modal} onClose={() => setModal(false)} />
    </div>
  )
}
