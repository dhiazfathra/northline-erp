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

// Reference quick actions: it renders these untranslated in ID too; Permintaan pembelian has no screen, so it opens the generic Item Requests list.
const actions = [
  { name: { id: 'Quote', en: 'Quote' }, to: '/docs/sales-quotation' },
  { name: { id: 'Order', en: 'Order' }, to: '/docs/sales-order' },
  { name: { id: 'Invoice', en: 'Invoice' }, to: '/docs/sales-invoice' },
  { name: { id: 'Purchase request', en: 'Purchase request' }, to: '/modules/item-requests' },
  { name: { id: 'Purchase order', en: 'Purchase order' }, to: '/docs/purchase-order' },
]
const periods = [
  { id: 'Hari ini', en: 'Today' },
  { id: '7 hari terakhir', en: 'Past 7 days' },
  { id: '30 hari terakhir', en: 'Past 30 days' },
  { id: 'Kuartal ini', en: 'This quarter' },
]
const PER_PAGE = 2
// reference "rb" glow over glass card: first card glows top-right, second bottom-left
const rb = (at: string) =>
  `radial-gradient(60% 70% at ${at},rgba(236,72,153,.42) 0%,rgba(139,92,246,.3) 30%,rgba(59,130,246,.18) 50%,transparent 72%),radial-gradient(40% 50% at ${at},rgba(250,170,90,.22) 0%,transparent 70%),var(--card)`
const cardGlow = [rb('100% 0%'), rb('0% 100%')]

const Arrow = ({ size = 9 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 9 9">
    <path d="M2 7l5-5M3 2h4v4" className="stroke-(--ink)" fill="none" strokeWidth="1" />
  </svg>
)

function KpiCard({ k, onOpen }: { k: Kpi; onOpen: () => void }) {
  const { L, isMobile, isDesktop } = useShell()
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
        <span className={cn('tracking-[-1.5px]', isMobile ? 'text-[36px]/none' : isDesktop ? 'text-[46px]/none' : 'text-[44px]/none')}>{k.value}</span>
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
  const [per, setPer] = useState(1) // reference default: Past 7 days
  const period = periods[per][lang]
  const { data } = useOverview(periods[per].en)
  const [kpiPage, setKpiPage] = useState(0)
  const [lowTab, setLowTab] = useState(0)
  const [compact, setCompact] = useState(false)
  const [drawer, setDrawer] = useState<DrawerRecord | null>(null)
  const [modal, setModal] = useState(false)
  const go = (to: string) => void navigate({ to })
  const px = isMobile ? 'px-[16px]' : isDesktop ? 'px-[40px]' : 'px-[24px]'
  const pages = data ? Math.ceil(data.kpis.length / PER_PAGE) : 1
  const kpis = data?.kpis.slice(kpiPage * PER_PAGE, kpiPage * PER_PAGE + PER_PAGE)

  return (
    <>
      <div className={cn('grid flex-none animate-[fade_.25s]', px, isDesktop ? 'grid-cols-[600px_minmax(0,1fr)] gap-[40px]' : 'grid-cols-1 gap-[8px]')}>
        <div className="min-w-0">
          <div className="mt-[20px] flex items-center gap-[8px]">
            {/* one scrolling row: long (ID) labels must not wrap and push the KPI block down */}
            <div className="no-scrollbar flex min-w-0 flex-1 flex-nowrap items-center gap-[8px] overflow-x-auto">
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
            </div>
            <button
              type="button"
              aria-label={t({ id: 'Transaksi baru', en: 'New transaction' })}
              className="ml-auto flex size-[34px] flex-none cursor-pointer items-center justify-center rounded-full bg-(--ink) text-[18px] text-(--paper) transition-transform hover:rotate-90"
              onClick={() => setModal(true)}
            >
              +
            </button>
          </div>
          <div className={cn('grid', isMobile ? 'mt-[26px] grid-cols-1 gap-[36px]' : cn('grid-cols-2 gap-[40px]', isDesktop ? 'mt-[34px]' : 'mt-[30px]'))}>
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
        <div className={cn('grid gap-[16px]', isDesktop ? 'mt-[20px] auto-rows-[420px] grid-cols-2' : isMobile ? 'auto-rows-[200px] grid-cols-1' : 'mt-[4px] auto-rows-[260px] grid-cols-2')}>
          {data
            ? data.cards.map((c, i) => (
                <button
                  key={c.id}
                  type="button"
                  className="relative cursor-pointer overflow-hidden rounded-[30px] border border-[rgba(var(--fg),.25)] text-left shadow-[0_30px_60px_rgba(0,0,0,.18)] transition-transform duration-250 hover:-translate-y-[4px]"
                  onClick={() => setDrawer(c.record)}
                >
                  <div className="absolute inset-[-40px] blur-[30px]" style={{ background: cardGlow[i % 2] }} />
                  <div className={cn('relative box-border flex h-full flex-col justify-between', isMobile ? 'px-[22px] pt-[22px] pb-[26px]' : isDesktop ? 'px-[30px] pt-[28px] pb-[40px]' : 'px-[26px] pt-[24px] pb-[30px]')}>
                    <div className="flex justify-between">
                      <span className="text-[14px]">{t(c.title)}</span>
                      <span className="rounded-[12px] bg-[rgba(var(--fg),.18)] px-[10px] py-[6px] text-[11px]">{L.review}</span>
                    </div>
                    <span className={cn('text-pretty', isMobile ? 'text-[23px]/[1.12]' : isDesktop ? 'text-[30px]/[1.12]' : 'text-[26px]/[1.12]')}>{t(c.text)}</span>
                  </div>
                </button>
              ))
            : [0, 1].map((i) => <Skeleton key={i} className="min-h-[200px] rounded-[30px] bg-[rgba(var(--fg),.07)]" />)}
        </div>
      </div>

      <div className={cn('box-border flex-none pt-[26px]', px, isMobile ? 'mt-[40px] pb-[32px]' : isDesktop ? 'mt-auto pb-[48px]' : 'mt-[40px] pb-[32px]')}>
        <div className="flex flex-wrap items-center gap-[8px]">
          {data?.lowTabs.map((l, i) => (
            <button
              key={l.name.en}
              type="button"
              className={cn('flex flex-none cursor-pointer gap-[6px] whitespace-nowrap rounded-[20px] px-[16px] py-[10px] text-[12px]', i === lowTab ? 'bg-(--ink) text-(--paper)' : 'bg-[rgba(var(--fg),.08)]')}
              onClick={() => {
                setLowTab(i)
                if (l.count === undefined) showToast(t({ id: 'Asisten sedang menyusun ringkasan…', en: 'Assistant is drafting a summary…' }))
              }}
            >
              {l.count !== undefined && <b className="font-semibold">{l.count}</b>}
              {t(l.name)}
            </button>
          ))}
          <span
            className={cn(
              'box-border flex min-w-[150px] items-center justify-between whitespace-nowrap rounded-[20px] bg-[rgba(var(--fg),.1)] px-[18px] py-[10px] text-[12px]',
              isMobile ? 'flex-1' : isDesktop ? 'ml-[300px] w-[200px] flex-none' : 'ml-auto w-[200px] flex-none',
            )}
          >
            <button type="button" className="cursor-pointer" onClick={() => setPer((p) => (p + 3) % 4)}>
              ‹
            </button>
            {period}
            <button type="button" className="cursor-pointer" onClick={() => setPer((p) => (p + 1) % 4)}>
              ›
            </button>
          </span>
          <button
            type="button"
            className={cn(
              'box-border flex cursor-pointer items-center justify-between whitespace-nowrap rounded-[20px] bg-[rgba(var(--fg),.1)] px-[16px] py-[10px] text-[11.5px] hover:bg-[rgba(var(--fg),.18)]',
              isMobile ? 'flex-1' : isDesktop ? 'ml-auto w-[200px] flex-none' : 'w-[200px] flex-none',
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
        <div className={cn('mt-[22px] grid', isDesktop ? 'grid-cols-[3fr_3fr_2fr] gap-[28px]' : isMobile ? 'grid-cols-1 gap-[26px]' : 'grid-cols-1 gap-[28px]')}>
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
                  <div
                    className={cn('no-scrollbar mt-[10px] grid gap-[8px]', isMobile && 'overflow-x-auto')}
                    style={{ gridTemplateColumns: `repeat(${g.tiles.length},${isMobile ? 'minmax(132px,1fr)' : 'minmax(0,1fr)'})` }}
                  >
                    {g.tiles.map((tl) =>
                      tl.off && tl.feature && !enabled.has(tl.feature) ? (
                        <div
                          key={tl.label.en}
                          aria-disabled="true"
                          title={t(tl.off)}
                          className={cn('box-border flex cursor-not-allowed flex-col justify-between rounded-[20px] border border-dashed border-[rgba(var(--fg),.3)] p-[16px] opacity-55', compact ? 'h-[120px]' : 'h-[178px]')}
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
                            compact ? 'h-[120px]' : 'h-[178px]',
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
                              <span className={cn('font-extralight', compact ? 'text-[24px]/[.9]' : isMobile ? 'text-[38px]/[.9]' : 'text-[46px]/[.9]')}>{tl.v}</span>
                              <span className="text-[9px]" style={{ color: tl.d.startsWith('-') ? '#ef4444' : '#22c55e' }}>{tl.d}</span>
                            </div>
                            <div className="flex flex-col items-end gap-[8px]">
                              <span className="text-[9px] opacity-45">{period}</span>
                              <div className="flex h-[16px] items-end gap-[2px]">
                                {tl.bars.map((h, i) => (
                                  <span key={i} className="w-[1.5px]" style={{ height: h, background: i === tl.bars.length - 1 ? '#22c55e' : 'rgba(var(--fg),.55)' }} />
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
