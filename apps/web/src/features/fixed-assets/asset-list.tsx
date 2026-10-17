import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { assetTotal, fixedAssetsQuery } from '@/api/fixed-assets'
import { Skeleton } from '@/components/ui/skeleton'
import { useShell, useT } from '@/lib/shell'
import { DocHeader, fmtDate, fmtIdr, tx } from './parts'

const cols = 'grid grid-cols-[1.3fr_2fr_1.4fr_.9fr_1.1fr_.8fr_1.1fr] gap-3'
export const faT = {
  code: { id: 'Kode Aset', en: 'Asset Code' },
  name: { id: 'Nama Aset', en: 'Asset Name' },
  cat: { id: 'Kategori', en: 'Category' },
  use: { id: 'Tgl Pakai', en: 'In Use' },
  loc: { id: 'Lokasi', en: 'Location' },
  status: { id: 'Status', en: 'Status' },
  value: { id: 'Nilai Aset', en: 'Asset Value' },
}
const status = {
  active: { n: { id: 'Aktif', en: 'Active' }, bg: 'rgba(34,197,94,.18)' },
  disposed: { n: { id: 'Dilepas', en: 'Disposed' }, bg: 'rgba(239,68,68,.16)' },
  draft: { n: { id: 'Draf', en: 'Draft' }, bg: 'rgba(var(--fg),.1)' },
}

export function AssetList() {
  const t = useT()
  const { L, refreshing } = useShell()
  const nav = useNavigate()
  const { data, isPending } = useQuery(fixedAssetsQuery)
  const [q, setQ] = useState('')
  const [applied, setApplied] = useState('')
  const rows = (data ?? []).filter((a) => `${a.code} ${a.name} ${a.category} ${a.location}`.toLowerCase().includes(applied.toLowerCase()))

  return (
    <DocHeader label={t(tx.title)}>
      <div className="mb-[14px] flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && setApplied(q)}
          placeholder="Ketik dan [Enter]"
          className="min-w-0 max-w-[360px] flex-[1_1_220px] rounded-[18px] border border-[rgba(var(--fg),.18)] bg-[rgba(var(--fg),.06)] px-[14px] py-[9px] text-[12px] text-(--ink) outline-none"
        />
        <span onClick={() => nav({ to: '/fixed-assets/new' })} className="ml-auto flex-none cursor-pointer rounded-[18px] bg-(--ink) px-4 py-[9px] text-[12px] font-normal text-(--paper)">
          + {L.newEntry}
        </span>
      </div>
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[820px]">
            <div className={`${cols} border-b border-[rgba(var(--fg),.12)] px-[22px] py-[13px] text-[11px] opacity-55`}>
              <span>{t(faT.code)}</span>
              <span>{t(faT.name)}</span>
              <span>{t(faT.cat)}</span>
              <span>{t(faT.use)}</span>
              <span>{t(faT.loc)}</span>
              <span>{t(faT.status)}</span>
              <span className="text-right">{t(faT.value)}</span>
            </div>
            {isPending &&
              Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="border-b border-[rgba(var(--fg),.07)] px-[22px] py-3">
                  <Skeleton className="h-[22px] rounded-[10px] bg-[rgba(var(--fg),.08)]" />
                </div>
              ))}
            {!isPending && !rows.length && <div className="px-[22px] py-7 text-center text-[13px] opacity-50">{t({ id: 'Tidak ada data', en: 'No records' })}</div>}
            {rows.map((r) => (
              <div
                key={r.id}
                data-rf-row="1"
                onClick={() => nav({ to: '/fixed-assets/$assetId', params: { assetId: r.id } })}
                style={{ opacity: refreshing ? 0.35 : 1 }}
                className={`${cols} cursor-pointer items-center border-b border-[rgba(var(--fg),.07)] px-[22px] py-3 text-[13px] transition-opacity duration-[.25s] hover:bg-[rgba(var(--fg),.08)]`}
              >
                <span className="tabular-nums">{r.code}</span>
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate">{r.name}</span>
                  {r.files.length > 0 && (
                    <span className="flex flex-none items-center gap-[3px] text-[11px] opacity-60">
                      <i className="ph-light ph-paperclip" />
                      {r.files.length}
                    </span>
                  )}
                </span>
                <span className="truncate opacity-75">{r.category}</span>
                <span className="opacity-75">{fmtDate(r.use)}</span>
                <span className="opacity-75">{r.location}</span>
                <span>
                  <span className="rounded-[12px] px-2.5 py-[5px] text-[11px]" style={{ background: status[r.status].bg }}>
                    {t(status[r.status].n)}
                  </span>
                </span>
                <span className="text-right tabular-nums">{fmtIdr(assetTotal(r))}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DocHeader>
  )
}
