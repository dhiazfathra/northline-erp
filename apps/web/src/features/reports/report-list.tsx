import type { Report } from '@northline/schemas/reports'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { reportCats, reportsQuery, reportTypes, useStarReport } from '@/api/reports'
import { Skeleton } from '@/components/ui/skeleton'
import { useShell, useT } from '@/lib/shell'
import { cn } from '@/lib/utils'
import { ParamsDialog } from './params-dialog'

const tx = {
  kicker: { id: 'Laporan', en: 'Reports' },
  star: { id: 'Tandai favorit', en: 'Add to favourites' },
  unstar: { id: 'Hapus dari favorit', en: 'Remove from favourites' },
  emptyQ: { id: 'Tidak ada laporan yang cocok dengan pencarian Anda.', en: 'No reports match your search.' },
  empty: { id: 'Belum ada laporan di kategori ini', en: 'No reports in this category yet' },
  clear: { id: 'Hapus pencarian', en: 'Clear search' },
}

export function ReportList() {
  const { L, isMobile, isDesktop, refreshing } = useShell()
  const t = useT()
  const { data, isPending } = useQuery(reportsQuery)
  const star = useStarReport()
  const nav = useNavigate()
  const [cat, setCat] = useState('fin')
  const [type, setType] = useState('all')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<Report | null>(null)

  const reps = data ?? []
  const inCat = (r: Report, c: string) => (c === 'memorize' ? r.starred : r.cat === c)
  const ql = q.trim().toLowerCase()
  const matchQ = (r: Report) => !ql || `${t(r.name)} ${t(r.desc)}`.toLowerCase().includes(ql)
  // a search spans every group
  const base = reps.filter((r) => (ql || inCat(r, cat)) && matchQ(r))
  const choose = (r: Report) => (r.href ? nav({ to: r.href }) : setOpen(r))
  const items = base.filter((r) => type === 'all' || r.type === type)
  const c = reportCats.find((x) => x.id === cat)!
  const catName = (id: string) => reportCats.find((x) => x.id === id)!
  const showCat = cat === 'memorize' || !!ql

  return (
    <div
      data-screen-label="Report list"
      className="grid flex-none animate-[fade_.25s] items-start gap-4 px-4 pt-5 pb-8 md:px-8"
      style={{ gridTemplateColumns: isMobile ? 'minmax(0,1fr)' : '240px minmax(0,1fr)' }}
    >
      {!isMobile && (
        <nav className="glass-card sticky top-0 flex flex-col gap-0.5 p-2.5">
          <span className="px-3 py-2 text-[10.5px] uppercase tracking-[.5px] opacity-50">{L.repCats}</span>
          {reportCats.map((x) => (
            <button
              key={x.id}
              type="button"
              onClick={() => setCat(x.id)}
              className={cn('flex cursor-pointer items-center gap-2.5 rounded-[12px] px-3 py-[9px] text-left text-[13px] transition-[background] duration-150 hover:bg-[rgba(var(--fg),.1)]', cat === x.id && 'bg-[rgba(var(--fg),.12)]')}
            >
              <i className={cn(x.icon, 'text-[17px] opacity-85')} />
              <span className="min-w-0 flex-1 truncate">{t(x.name)}</span>
              <span className="text-[10.5px] tabular-nums opacity-50">{reps.filter((r) => inCat(r, x.id)).length}</span>
            </button>
          ))}
        </nav>
      )}
      <div className="flex min-w-0 flex-col">
        {isMobile && (
          <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4">
            {reportCats.map((x) => (
              <button
                key={x.id}
                type="button"
                onClick={() => setCat(x.id)}
                className={cn('flex flex-none cursor-pointer items-center gap-[7px] whitespace-nowrap rounded-[18px] px-3.5 py-[9px] text-[12px]', cat === x.id ? 'bg-(--ink) text-(--paper)' : 'bg-[rgba(var(--fg),.1)]')}
              >
                <i className={cn(x.icon, 'text-[15px]')} />
                {t(x.name)}
              </button>
            ))}
          </div>
        )}
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3.5">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[.5px] opacity-60">{t(tx.kicker)}</div>
            <h1 className={cn('mt-1 flex items-center gap-3 tracking-[-.3px]', isMobile ? 'text-[24px]' : 'text-[30px]')}>
              <i className={cn(c.icon, 'text-[1em] opacity-85')} />
              {t(c.name)}
            </h1>
          </div>
          <span className={cn('flex min-w-0 items-center gap-2 rounded-[18px] border border-[rgba(var(--fg),.18)] bg-[rgba(var(--fg),.06)] pr-1.5 pl-3.5', isMobile ? 'flex-[1_1_100%]' : 'w-[280px] flex-none')}>
            <i className="ph-light ph-magnifying-glass text-[14px] opacity-60" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={L.repSearch}
              aria-label={L.repSearch}
              className="min-w-0 flex-1 border-none bg-transparent py-2.5 text-[12.5px] text-(--ink) outline-none"
            />
            {q && (
              <button type="button" aria-label={t(tx.clear)} onClick={() => setQ('')} className="flex size-[26px] flex-none cursor-pointer items-center justify-center rounded-full opacity-70 hover:bg-[rgba(var(--fg),.12)] hover:opacity-100">
                ×
              </button>
            )}
          </span>
        </div>
        <div className="mb-3.5 flex flex-wrap gap-2">
          {reportTypes.map((x) => (
            <button
              key={x.id}
              type="button"
              onClick={() => setType(x.id)}
              className={cn('flex cursor-pointer items-center gap-2 rounded-[18px] px-3.5 py-2 text-[12px] transition-[background] duration-150', type === x.id ? 'bg-(--ink) text-(--paper)' : 'bg-[rgba(var(--fg),.08)]')}
            >
              {x.c && <span className="size-[7px] rounded-full" style={{ background: x.c }} />}
              {t(x.name)}
              <span className="text-[11px] tabular-nums opacity-55">{x.id === 'all' ? base.length : base.filter((r) => r.type === x.id).length}</span>
            </button>
          ))}
        </div>
        <div className="glass-card overflow-hidden">
          <div className="grid gap-0.5 p-2" style={{ gridTemplateColumns: isDesktop ? 'repeat(2,minmax(0,1fr))' : 'minmax(0,1fr)' }}>
            {isPending &&
              Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="flex gap-3.5 p-3.5">
                  <Skeleton className="size-10 rounded-[13px] bg-[rgba(var(--fg),.1)]" />
                  <div className="flex flex-1 flex-col gap-2 pt-1">
                    <Skeleton className="h-3.5 w-2/5 bg-[rgba(var(--fg),.1)]" />
                    <Skeleton className="h-3 w-4/5 bg-[rgba(var(--fg),.08)]" />
                  </div>
                </div>
              ))}
            {items.map((r) => {
              const ty = reportTypes.find((x) => x.id === r.type)!
              const rc = catName(r.cat)
              return (
                <div
                  key={r.id}
                  data-rf-row="1"
                  role="button"
                  tabIndex={0}
                  onClick={() => choose(r)}
                  onKeyDown={(e) => e.key === 'Enter' && choose(r)}
                  className="flex animate-[fade_.2s] cursor-pointer items-start gap-3.5 rounded-[16px] p-3.5 transition-[background,opacity] duration-[.15s,.25s] hover:bg-[rgba(var(--fg),.08)]"
                  style={{ opacity: refreshing ? 0.35 : 1 }}
                >
                  <span className="flex size-10 flex-none items-center justify-center rounded-[13px]" style={{ background: `${ty.c}26`, color: ty.c }}>
                    <i className={cn(r.icon, 'text-[20px]')} />
                  </span>
                  <div className="min-w-0 flex-1 pt-px">
                    <div className="text-[14px] leading-[1.3]">{t(r.name)}</div>
                    <div className="mt-1 text-[11.5px] leading-[1.45] text-pretty opacity-60">{t(r.desc)}</div>
                    {showCat && (
                      <div className="mt-[7px] flex items-center gap-1.5 text-[10.5px] opacity-55">
                        <i className={cn(rc.icon, 'text-[12px]')} />
                        {t(rc.name)}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    title={t(r.starred ? tx.unstar : tx.star)}
                    aria-label={t(r.starred ? tx.unstar : tx.star)}
                    onClick={(e) => {
                      e.stopPropagation()
                      star.mutate(r.id)
                    }}
                    className={cn('flex size-[30px] flex-none cursor-pointer items-center justify-center rounded-full transition-opacity duration-150 hover:bg-[rgba(var(--fg),.12)] hover:opacity-100', r.starred ? 'text-[#f59e0b] opacity-100' : 'opacity-40')}
                  >
                    <i className={cn(r.starred ? 'ph-fill' : 'ph-light', 'ph-star text-[16px]')} />
                  </button>
                </div>
              )
            })}
            {!isPending && !items.length && (
              <div className="col-span-full flex flex-col items-center gap-3 px-5 py-14 text-center">
                <i className={cn(ql ? 'ph-light ph-magnifying-glass' : c.icon, 'text-[28px] opacity-45')} />
                <span className="max-w-[320px] text-[13px] leading-[1.45] text-pretty opacity-60">{t(ql ? tx.emptyQ : tx.empty)}</span>
                {ql && (
                  <button type="button" onClick={() => setQ('')} className="cursor-pointer rounded-[16px] border border-[rgba(var(--fg),.3)] bg-transparent px-3.5 py-2 text-[12px] text-(--ink)">
                    {t(tx.clear)}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {open && <ParamsDialog key={open.id} report={open} onClose={() => setOpen(null)} />}
    </div>
  )
}
