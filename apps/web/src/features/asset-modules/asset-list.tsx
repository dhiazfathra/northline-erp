import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { assetExpendituresQuery, branchesQuery } from '@/api/asset-modules'
import { Dropdown } from '@/components/dropdown'
import { Skeleton } from '@/components/ui/skeleton'
import { useShell, useT } from '@/lib/shell'
import { DocFrame } from './doc-header'
import { idr, S } from './strings'

const cols = '1.3fr .9fr 2.4fr 1fr .7fr 1.1fr 1fr'
const heads = [
  { l: { id: 'Nomor', en: 'Number' } },
  { l: { id: 'Tanggal', en: 'Date' } },
  { l: { id: 'Deskripsi', en: 'Description' } },
  { l: { id: 'Cabang', en: 'Branch' } },
  { l: { id: 'Kuantitas', en: 'Qty' }, r: true },
  { l: { id: 'Total', en: 'Total' }, r: true },
  { l: { id: 'Status', en: 'Status' } },
]

export function AssetList() {
  const { L, refreshing, showToast } = useShell()
  const t = useT()
  const nav = useNavigate()
  const { data, isPending } = useQuery(assetExpendituresQuery)
  const { data: branches = [] } = useQuery(branchesQuery)
  const [status, setStatus] = useState('')
  const [branch, setBranch] = useState('')
  const [draft, setDraft] = useState('')
  const [q, setQ] = useState('')
  const rows = useMemo(
    () =>
      (data ?? []).filter(
        (r) =>
          (!status || r.status === status) &&
          (!branch || branch === 'Semua' || r.branch === branch) &&
          (!q || `${r.number} ${r.description}`.toLowerCase().includes(q.toLowerCase())),
      ),
    [data, status, branch, q],
  )

  return (
    <DocFrame mod={t(S.mod)} label={t(S.list)} subs={[{ name: t(S.list), to: '/asset-modules', active: true }]}>
      <div className="mb-[14px] flex flex-wrap items-center gap-2">
        <span className="w-[150px] flex-none">
          <Dropdown value={status} options={['Draf', 'Disetujui']} onSelect={setStatus} placeholder="Status" className="h-[34px] rounded-[18px] bg-transparent px-[14px] py-2 text-[12px]" />
        </span>
        <span className="w-[150px] flex-none">
          <Dropdown value={branch} options={branches} onSelect={setBranch} placeholder={t({ id: 'Cabang', en: 'Branch' })} className="h-[34px] rounded-[18px] bg-transparent px-[14px] py-2 text-[12px]" />
        </span>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && setQ(draft)}
          placeholder={t({ id: 'Ketik dan [Enter]', en: 'Type and [Enter]' })}
          aria-label={t({ id: 'Cari', en: 'Search' })}
          className="max-w-[360px] min-w-0 flex-[1_1_220px] rounded-[18px] border border-[rgba(var(--fg),.18)] bg-[rgba(var(--fg),.06)] px-[14px] py-[9px] text-[12px] text-(--ink) outline-none"
        />
        <span className="text-[11.5px] tabular-nums opacity-80">{isPending ? '…' : `${rows.length} ${t({ id: 'data', en: 'rows' })}`}</span>
        <Link to="/asset-modules/new" className="ml-auto flex-none cursor-pointer rounded-[18px] bg-(--ink) px-4 py-[9px] text-[12px] text-(--paper)">
          + {L.newEntry}
        </Link>
      </div>
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[860px]">
            <div className="grid gap-3 border-b border-[rgba(var(--fg),.12)] px-[22px] py-[13px] text-[11px] opacity-55" style={{ gridTemplateColumns: cols }}>
              {heads.map((h) => (
                <span key={h.l.id} className={h.r ? 'text-right' : ''}>{t(h.l)}</span>
              ))}
            </div>
            {isPending &&
              [0, 1, 2, 3].map((i) => (
                <div key={i} className="border-b border-[rgba(var(--fg),.07)] px-[22px] py-[14px]">
                  <Skeleton className="h-4 w-full bg-[rgba(var(--fg),.08)]" />
                </div>
              ))}
            {rows.map((r) => (
              <div
                key={r.id}
                data-rf-row="1"
                onClick={() => (r.status === 'Draf' ? nav({ to: '/asset-modules/new' }) : showToast(`${r.number} · ${r.status}`))}
                className="grid cursor-pointer items-center gap-3 border-b border-[rgba(var(--fg),.07)] px-[22px] py-3 text-[13px] transition-opacity duration-250 hover:bg-[rgba(var(--fg),.08)]"
                style={{ gridTemplateColumns: cols, opacity: refreshing ? 0.35 : 1 }}
              >
                <span className="truncate tabular-nums">{r.number}</span>
                <span className="truncate tabular-nums">{r.date}</span>
                <span className="truncate">{r.description}</span>
                <span className="truncate">{r.branch}</span>
                <span className="text-right tabular-nums">{r.qty}</span>
                <span className="text-right tabular-nums">{idr(r.total)}</span>
                <span className="flex flex-col">
                  <span
                    className={`inline-flex self-start items-center gap-[5px] rounded-xl border px-[10px] py-[3px] text-[11.5px] ${r.status === 'Draf' ? 'border-[rgba(var(--fg),.25)] bg-[rgba(var(--fg),.06)]' : 'border-[rgba(34,197,94,.45)] bg-[rgba(34,197,94,.12)]'}`}
                  >
                    <i className={r.status === 'Draf' ? 'ph-light ph-pencil-simple' : 'ph-light ph-check-circle'} aria-hidden="true" />
                    {r.status}
                  </span>
                </span>
              </div>
            ))}
            {!isPending && rows.length === 0 && <div className="p-7 text-center text-[13px] opacity-50">{t(S.empty)}</div>}
          </div>
        </div>
      </div>
    </DocFrame>
  )
}
