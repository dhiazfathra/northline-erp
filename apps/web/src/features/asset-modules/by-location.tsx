import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { assetLocationsQuery, branches } from '@/api/asset-modules'
import { Dropdown } from '@/components/dropdown'
import { Skeleton } from '@/components/ui/skeleton'
import { useShell, useT } from '@/lib/shell'
import { DocFrame } from './doc-header'
import { S } from './strings'

const cols = '1.4fr 2.6fr .8fr'
const iconBtn = 'flex size-[34px] flex-none cursor-pointer items-center justify-center rounded-full border border-[rgba(var(--fg),.18)] hover:bg-[rgba(var(--fg),.1)]'

export function AssetsByLocation() {
  const { mode, refreshing, refresh, showToast } = useShell()
  const t = useT()
  const [kind, setKind] = useState('Cabang')
  const [branch, setBranch] = useState('Semua')
  const [date, setDate] = useState('2026-10-17')
  const { data, isPending } = useQuery(assetLocationsQuery(branch, date))
  const dd = 'h-9 rounded-[18px] px-3 py-[9px] text-[12px]'

  return (
    <DocFrame mod={t(S.mod)} label={t(S.byLoc)} subs={[{ name: t(S.byLoc), to: '/asset-modules/by-location', active: true }]}>
      <div className="mb-[14px] flex flex-wrap items-center gap-2">
        <span className="w-[110px] flex-none">
          <Dropdown value={kind} options={['Cabang']} onSelect={(v) => setKind(v || 'Cabang')} noClear className={dd} />
        </span>
        <span className="max-w-[320px] min-w-0 flex-[1_1_220px]">
          <Dropdown value={branch} options={branches} onSelect={(v) => setBranch(v || 'Semua')} noClear className={dd} />
        </span>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-label={t({ id: 'Per tanggal', en: 'As of' })}
          className="flex-none rounded-[18px] border border-[rgba(var(--fg),.18)] bg-[rgba(var(--fg),.06)] px-3 py-2 text-[12px] text-(--ink) outline-none"
          style={{ colorScheme: mode }}
        />
        <button type="button" aria-label="Refresh" className={iconBtn} onClick={refresh}>
          <i className="ph-light ph-arrows-clockwise" />
        </button>
        <button type="button" aria-label="Export" className={iconBtn} onClick={() => showToast(t({ id: 'Laporan diekspor', en: 'Report exported' }))}>
          <i className="ph-light ph-export" />
        </button>
      </div>
      <div className="glass-card overflow-hidden">
        <div className="grid gap-3 border-b border-[rgba(var(--fg),.12)] px-[22px] py-[13px] text-[11px] opacity-55" style={{ gridTemplateColumns: cols }}>
          <span>{t({ id: 'Nama', en: 'Name' })}</span>
          <span>{t({ id: 'Alamat', en: 'Address' })}</span>
          <span className="text-right">{t({ id: 'Kuantitas', en: 'Qty' })}</span>
        </div>
        {isPending &&
          [0, 1, 2].map((i) => (
            <div key={i} className="border-b border-[rgba(var(--fg),.07)] px-[22px] py-[14px]">
              <Skeleton className="h-4 w-full bg-[rgba(var(--fg),.08)]" />
            </div>
          ))}
        {data?.map((r) => (
          <div
            key={r.name}
            data-rf-row="1"
            className="grid gap-3 border-b border-[rgba(var(--fg),.07)] px-[22px] py-3 text-[13px] transition-opacity duration-250"
            style={{ gridTemplateColumns: cols, opacity: refreshing ? 0.35 : 1 }}
          >
            <span>{r.name}</span>
            <span className="opacity-75">{r.address}</span>
            <span className="text-right tabular-nums">{r.qty}</span>
          </div>
        ))}
        {data?.length === 0 && <div className="p-7 text-center text-[13px] opacity-50">{t(S.empty)}</div>}
      </div>
    </DocFrame>
  )
}
