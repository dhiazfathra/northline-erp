import type { DrawerRecord, Kpi } from '@northline/schemas/overview'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useOverview } from '@/api/overview'
import { Skeleton } from '@/components/ui/skeleton'
import { useEnabledFeatures } from '@/lib/features'
import { notDesigned } from '@/lib/nav'
import { useShell, useT } from '@/lib/shell'
import { cn } from '@/lib/utils'
import { RecordDrawer } from './drawer'
import { NewTxModal } from './new-tx-modal'

const actions = [
  { name: { id: 'Faktur Penjualan', en: 'Sales Invoice' }, to: '/docs/sales-invoice' },
  { name: { id: 'Penerimaan', en: 'Receipt' }, to: '/docs/cash-receipt' },
  { name: { id: 'Pembayaran', en: 'Payment' }, to: '/docs/cash-payment' },
  { name: { id: 'Faktur Pembelian', en: 'Purchase Invoice' }, to: '/docs/purchase-invoice' },
  { name: { id: 'Jurnal Umum', en: 'Journal' }, to: '/docs/journal' },
]
const months = {
  id: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
}
const PER_PAGE = 2

const Arrow = ({ size = 9 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 9 9">
    <path d="M2 7l5-5M3 2h4v4" className="stroke-(--ink)" fill="none" strokeWidth="1" />
  </svg>
)

function KpiCard({ k, onOpen }: { k: Kpi; onOpen: () => void }) {
  const { L, isMobile } = useShell()
  const t = useT()
  return (
    <div className="min-w-0">
      <div className="flex h-[44px] items-start justify-between">
        <span className="max-w-[170px] text-[15px] leading-[1.25]">{t(k.label)}</span>
        <button
          type="button"
          aria-label={t(k.label)}
          className="flex size-[40px] flex-none cursor-pointer items-center justify-center rounded-full bg-[rgba(var(--fg),.07)] hover:bg-[rgba(var(--fg),.2)]"
          onClick={onOpen}
        >
          <Arrow />
        </button>
      </div>
      <div className="mt-[38px] flex items-start gap-[4px]">
        <span className={cn('leading-none tracking-[-1.5px]', isMobile ? 'text-[24px]' : 'text-[44px]')}>{k.value}</span>
        <span className="mt-[6px] text-[11px] opacity-75">IDR</span>
      </div>
      <div className="relative mt-[44px] flex h-[56px] items-end gap-[4px] overflow-hidden pt-[22px]">
        {k.cols.map((n, i) => (
          // first half = last month (dimmed), second half = this month
          <div key={i} className="flex flex-col gap-[3px]" style={{ opacity: i < k.cols.length / 2 ? 0.35 : 1 }}>
            {Array.from({ length: n }, (_, j) => (
              <span key={j} className="size-[2.5px] rounded-full bg-(--ink)" />
            ))}
          </div>
        ))}
        <span className="absolute top-0 left-[calc(50%-10px)] rounded-[16px] bg-[rgba(var(--fg),.14)] px-[10px] py-[6px] text-[12px]">{k.delta}</span>
      </div>
      <div className="mt-[12px] flex gap-[60px] text-[11px] opacity-65">
        <span>{L.prev}</span>
        <span>{L.cur}</span>
      </div>
    </div>
  )
}

export function OverviewScreen() {
  const { L, lang, isMobile, isDesktop, setSearchOpen, showToast } = useShell()
  const enabled = useEnabledFeatures()
  const t = useT()
  const navigate = useNavigate()
  const [month, setMonth] = useState(9) // Okt 2026
  const period = `${months[lang][month]} 2026`
  const { data } = useOverview(`2026-${month + 1}`)
  const [kpiPage, setKpiPage] = useState(0)
  const [lowTab, setLowTab] = useState(0)
  const [compact, setCompact] = useState(false)
  const [drawer, setDrawer] = useState<DrawerRecord | null>(null)
  const [modal, setModal] = useState(false)
  const go = (to: string) => void navigate({ to })
  const px = isMobile ? 'px-[16px]' : 'px-[32px]'
  const pages = data ? Math.ceil(data.kpis.length / PER_PAGE) : 1
  const kpis = data?.kpis.slice(kpiPage * PER_PAGE, kpiPage * PER_PAGE + PER_PAGE)

  return (
    <>
      <div className={cn('grid flex-none animate-[fade_.25s]', px, isDesktop ? 'grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] gap-[48px]' : 'grid-cols-1 gap-[8px]')}>
        <div className="min-w-0">
          <div className={cn('no-scrollbar mt-[20px] flex items-center gap-[8px]', isMobile ? 'flex-nowrap overflow-x-auto' : 'flex-wrap')}>
            {actions.map((a) => (
              <button
                key={a.to}
                type="button"
                className="flex flex-none cursor-pointer items-center gap-[6px] whitespace-nowrap rounded-[20px] bg-[rgba(var(--fg),.07)] px-[13px] py-[8px] text-[11.5px] hover:bg-[rgba(var(--fg),.18)]"
                onClick={() => go(a.to)}
              >
                <span className="size-[10px] rounded-full border border-white text-center text-[9px] leading-[9px]">+</span>
                {t(a.name)}
              </button>
            ))}
            <button
              type="button"
              aria-label={t({ id: 'Transaksi baru', en: 'New transaction' })}
              className="ml-auto flex size-[34px] flex-none cursor-pointer items-center justify-center rounded-full bg-(--ink) text-[18px] text-(--paper) transition-transform hover:rotate-90"
              onClick={() => setModal(true)}
            >
              +
            </button>
          </div>
          <div className={cn('grid grid-cols-2', isMobile ? 'mt-[28px] gap-[20px]' : 'mt-[40px] gap-[40px]')}>
            {kpis
              ? kpis.map((k) => <KpiCard key={k.label.en} k={k} onOpen={() => go(k.to)} />)
              : [0, 1].map((i) => <Skeleton key={i} className="h-[270px] rounded-[20px] bg-[rgba(var(--fg),.07)]" />)}
          </div>
          <div className="mt-[26px] flex items-center gap-[14px]">
            <span className="h-px flex-1 bg-[rgba(var(--fg),.2)]" />
            <span className="flex items-center gap-[14px] rounded-[16px] bg-[rgba(var(--fg),.08)] px-[14px] py-[6px] text-[12px]">
              <button type="button" className="cursor-pointer" onClick={() => setKpiPage((p) => (p + pages - 1) % pages)}>
                ‹
              </button>
              <span className="text-[10.5px] opacity-60">
                {kpiPage + 1} / {pages}
              </span>
              <button type="button" className="cursor-pointer" onClick={() => setKpiPage((p) => (p + 1) % pages)}>
                ›
              </button>
            </span>
            <span className="h-px flex-1 bg-[rgba(var(--fg),.2)]" />
          </div>
        </div>
        <div className={cn('mt-[20px] grid gap-[16px]', isDesktop ? 'auto-rows-[minmax(0,1fr)] grid-cols-2' : isMobile ? 'auto-rows-[200px] grid-cols-1' : 'auto-rows-[220px] grid-cols-2')}>
          {data
            ? data.cards.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="relative cursor-pointer overflow-hidden rounded-[30px] border border-[rgba(var(--fg),.25)] text-left shadow-[0_30px_60px_rgba(0,0,0,.18)] transition-transform duration-250 hover:-translate-y-[4px]"
                  onClick={() => setDrawer(c.record)}
                >
                  <div className="absolute inset-[-40px] blur-[30px]" style={{ background: c.bg }} />
                  <div className={cn('relative box-border flex h-full flex-col justify-between', isMobile ? 'p-[20px]' : 'p-[24px]')}>
                    <div className="flex justify-between">
                      <span className="text-[14px]">{t(c.title)}</span>
                      <span className="rounded-[12px] bg-[rgba(var(--fg),.18)] px-[10px] py-[6px] text-[11px]">{L.review}</span>
                    </div>
                    <span className={cn('leading-[1.12] text-pretty', isMobile ? 'text-[22px]' : 'text-[26px]')}>{t(c.text)}</span>
                  </div>
                </button>
              ))
            : [0, 1].map((i) => <Skeleton key={i} className="min-h-[200px] rounded-[30px] bg-[rgba(var(--fg),.07)]" />)}
        </div>
      </div>

      <div className={cn('box-border flex-none pt-[26px]', px, isMobile ? 'mt-[12px] pb-[32px]' : 'mt-[28px] pb-[40px]')}>
        <div className="flex flex-wrap items-center gap-[8px]">
          {data?.lowTabs.map((l, i) => (
            <button
              key={l.name.en}
              type="button"
              className={cn('flex flex-none cursor-pointer gap-[6px] whitespace-nowrap rounded-[20px] px-[16px] py-[10px] text-[12px]', i === lowTab ? 'bg-(--ink) text-(--paper)' : 'bg-[rgba(var(--fg),.08)]')}
              onClick={() => setLowTab(i)}
            >
              <b className="font-semibold">{l.count}</b>
              {t(l.name)}
            </button>
          ))}
          <span
            className={cn(
              'box-border flex min-w-[150px] items-center justify-between whitespace-nowrap rounded-[20px] bg-[rgba(var(--fg),.1)] px-[18px] py-[10px] text-[12px]',
              isMobile ? 'flex-1' : 'ml-auto w-[190px] flex-none',
            )}
          >
            <button type="button" className="cursor-pointer" onClick={() => setMonth((m) => Math.max(0, m - 1))}>
              ‹
            </button>
            {period}
            <button type="button" className="cursor-pointer" onClick={() => setMonth((m) => Math.min(11, m + 1))}>
              ›
            </button>
          </span>
          <button
            type="button"
            className={cn(
              'box-border flex cursor-pointer items-center justify-between whitespace-nowrap rounded-[20px] bg-[rgba(var(--fg),.1)] px-[16px] py-[10px] text-[11.5px] hover:bg-[rgba(var(--fg),.18)]',
              isMobile ? 'flex-1' : 'w-[200px] flex-none',
            )}
            onClick={() => setSearchOpen(true)}
          >
            {L.search} ⌘K
            <svg width="11" height="11" viewBox="0 0 11 11">
              <circle cx="4.5" cy="4.5" r="3.5" className="stroke-(--ink)" fill="none" />
              <path d="M7.5 7.5L10 10" className="stroke-(--ink)" />
            </svg>
          </button>
          <button
            type="button"
            aria-label={t({ id: 'Tampilan ringkas', en: 'Compact view' })}
            aria-pressed={compact}
            className="flex size-[36px] flex-none cursor-pointer items-center justify-center rounded-full bg-(--ink)"
            onClick={() => setCompact((c) => !c)}
          >
            <svg width="12" height="10" viewBox="0 0 12 10">
              <path d="M1 1h10M3 5h8M5 9h6" className="stroke-(--paper)" strokeWidth="1.2" />
            </svg>
          </button>
        </div>
        <div className={cn('mt-[22px] grid', isDesktop ? 'grid-cols-3 gap-[28px]' : isMobile ? 'grid-cols-1 gap-[24px]' : 'grid-cols-2 gap-[24px]')}>
          {data
            ? data.groups.map((g) => (
                <div key={g.title.en} className="min-w-0">
                  <div className="flex min-h-[52px] items-start justify-between gap-[12px]">
                    <div>
                      <div className="text-[15px]">{t(g.title)}</div>
                      <div className="mt-[4px] text-[10.5px] opacity-50">{t(g.sub)}</div>
                    </div>
                    {g.to && (
                      <button
                        type="button"
                        className="flex-none cursor-pointer whitespace-nowrap rounded-[16px] bg-[rgba(var(--fg),.1)] px-[14px] py-[8px] text-[11.5px] hover:bg-[rgba(var(--fg),.2)]"
                        onClick={() => g.to && go(g.to)}
                      >
                        {L.viewAll}
                      </button>
                    )}
                  </div>
                  <div className={cn('no-scrollbar mt-[10px] grid gap-[8px]', isMobile ? 'grid-cols-[repeat(3,minmax(140px,1fr))] overflow-x-auto' : 'grid-cols-3')}>
                    {g.tiles.map((tl) =>
                      tl.off && tl.feature && !enabled.has(tl.feature) ? (
                        <div
                          key={tl.label.en}
                          aria-disabled="true"
                          title={t(tl.off)}
                          className={cn('box-border flex cursor-not-allowed flex-col justify-between rounded-[20px] border border-dashed border-[rgba(var(--fg),.3)] p-[16px] opacity-55', compact ? 'h-[96px]' : 'h-[150px]')}
                        >
                          <div className="flex w-full items-start justify-between">
                            <span className="max-w-[90px] text-[12px] leading-[1.25]">{t(tl.label)}</span>
                            <i className="ph-light ph-lock-simple text-[16px]" />
                          </div>
                          <span className="text-[10.5px] leading-[1.3]">{t(tl.off)}</span>
                        </div>
                      ) : (
                        <button
                          key={tl.label.en}
                          type="button"
                          className={cn(
                            'glass-card box-border flex cursor-pointer flex-col justify-between rounded-[20px] border-[rgba(var(--fg),.1)] p-[16px] text-left shadow-[inset_0_1px_0_rgba(var(--fg),.12)] transition-[background,height] duration-300 hover:bg-[rgba(var(--fg),.09)]',
                            compact ? 'h-[96px]' : 'h-[150px]',
                          )}
                          onClick={() => (tl.to ? go(tl.to) : showToast(t(notDesigned)))}
                        >
                          <div className="flex w-full items-start justify-between">
                            <span className="max-w-[90px] text-[12px] leading-[1.25]">{t(tl.label)}</span>
                            <span className="flex size-[30px] flex-none items-center justify-center rounded-full bg-[rgba(var(--fg),.07)]">
                              <Arrow size={12} />
                            </span>
                          </div>
                          <div className="flex w-full items-end justify-between">
                            <div className="flex items-start gap-[3px]">
                              <span className={cn('font-extralight leading-[.9]', compact ? 'text-[24px]' : 'text-[34px]')}>{tl.v}</span>
                              <span className="text-[9px] opacity-50">{tl.d}</span>
                            </div>
                            <div className="flex flex-col items-end gap-[8px]">
                              <span className="text-[9px] opacity-45">{period}</span>
                              <div className="flex h-[16px] items-end gap-[2px]">
                                {tl.bars.map((h, i) => (
                                  <span key={i} className="w-[1.5px]" style={{ height: h, background: i === tl.bars.length - 1 ? '#ec4899' : 'rgba(var(--fg),.35)' }} />
                                ))}
                              </div>
                            </div>
                          </div>
                        </button>
                      ),
                    )}
                  </div>
                </div>
              ))
            : [0, 1, 2].map((i) => <Skeleton key={i} className="h-[212px] rounded-[20px] bg-[rgba(var(--fg),.07)]" />)}
        </div>
      </div>
      <RecordDrawer record={drawer} onClose={() => setDrawer(null)} />
      <NewTxModal open={modal} onClose={() => setModal(false)} />
    </>
  )
}
