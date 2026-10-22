import type { ReportRow, ReportSearch } from '@northline/schemas/reports'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { useState, type CSSProperties } from 'react'
import { reportCats, reportLayoutQuery, reportRowsQuery, reportsQuery } from '@/api/reports'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useShell, useT } from '@/lib/shell'
import { cn } from '@/lib/utils'
import { AiPanel } from './ai-panel'
import { DrillDialog } from './drill-dialog'
import { LayoutDialog } from './layout-dialog'
import { applyFilters, colDefs, fmtDate, fmtNum, fontCss, paperMm, type ColId, type Layout } from './model'

const tx = {
  hint: { id: 'Klik angka untuk melihat rincian transaksi', en: 'Click a figure to see its transactions' },
  refresh: { id: 'Muat ulang', en: 'Reload' },
  layout: { id: 'Ubah tata letak', en: 'Edit layout' },
  print: { id: 'Cetak', en: 'Print' },
  period: { id: 'Periode', en: 'Period' },
  asOf: { id: 'Per tanggal', en: 'As of' },
  branch: { id: 'Cabang', en: 'Branch' },
  cur: { id: 'Mata uang', en: 'Currency' },
  basis: { id: 'Basis', en: 'Basis' },
  accrual: { id: 'Akrual', en: 'Accrual' },
  printed: { id: 'Dicetak 17/10/2026 10:24 oleh Dhiaz', en: 'Printed 17/10/2026 10:24 by Dhiaz' },
  page: { id: 'Halaman 1 dari 1', en: 'Page 1 of 1' },
  drill: { id: 'Membuka rincian transaksi', en: 'Opening transactions for' },
  exp: { id: 'Mengekspor', en: 'Exporting' },
}
const exps = [
  { name: 'PDF', icon: 'ph-light ph-file-pdf' },
  { name: 'Excel', icon: 'ph-light ph-file-xls' },
  { name: 'CSV', icon: 'ph-light ph-file-csv' },
]
const rowKind: Record<ReportRow['k'], CSSProperties> = {
  sec: { minHeight: 34, marginTop: 14, letterSpacing: '.9px', textTransform: 'uppercase' },
  grp: { minHeight: 28, marginTop: 6 },
  acc: { minHeight: 26 },
  sub: { minHeight: 28, borderTop: '1px solid #d4d4d8' },
  tot: { minHeight: 32, marginTop: 6, background: '#f4f4f5', borderRadius: 6 },
}
const skel: CSSProperties = { color: 'transparent', backgroundImage: 'linear-gradient(90deg,#f1f1f4 0%,#e0e0e8 18%,#f1f1f4 36%)', backgroundSize: '300% 100%', animation: 'shim 1.4s linear infinite', borderRadius: 4, boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' }
const placeholder: ReportRow[] = Array.from({ length: 14 }, (_, i) => (i % 5 ? { k: 'acc', t: 'Memuat akun laporan', cur: 12_450_000 } : { k: 'grp', t: 'Memuat grup' }))
const MM = 3.78

export function ReportView({ id, search }: { id: string; search: ReportSearch }) {
  const { L, isMobile, isDesktop, showToast } = useShell()
  const t = useT()
  const nav = useNavigate()
  const reps = useQuery(reportsQuery).data
  const rep = reps?.find((r) => r.id === id)
  const rowsQ = useQuery(reportRowsQuery(id, search))
  const layout = useQuery(reportLayoutQuery(id)).data
  const [zoom, setZoom] = useState(isMobile ? 0.4 : isDesktop ? 1 : 0.8)
  const [md, setMd] = useState(false)
  const [drill, setDrill] = useState<ReportRow | null>(null)
  const ai = search.ai === 1
  const setAi = (on: boolean) => nav({ to: '.', search: (s) => ({ ...s, ai: on ? 1 : undefined }), replace: true })

  if (!layout) return null
  const loading = rowsQ.isFetching
  const opts = search.opts.split(',')
  const name = rep ? t(rep.name) : id
  const cat = reportCats.find((c) => c.id === rep?.cat)
  const cols = layout.cols ?? ([...(opts.includes('code') ? ['code'] : []), 'cur', ...search.cols.split(',').filter((c): c is ColId => c in colDefs)] as ColId[]).map((c) => ({ id: c as ColId, name: '', on: true }))
  const colName = (c: { id: ColId; name: string }) => c.name || t(colDefs[c.id])
  const pre = cols.filter((c) => c.on && c.id === 'code')
  const num = cols.filter((c) => c.on && c.id !== 'code')
  const grid = [...pre.map(() => '64px'), 'minmax(0,1fr)', ...num.map((c) => (c.id === 'pct' ? '76px' : '118px'))].join(' ')
  const data = rowsQ.data
  const tabular = data && 'grid' in data ? data.grid : undefined
  const apiRows = data && 'rows' in data ? data.rows : undefined
  const src = apiRows ? (layout.rows ?? apiRows) : placeholder
  const rows = applyFilters(src, layout.flt).filter((r) => opts.includes('total') || (r.k !== 'sub' && r.k !== 'tot'))
  const F = layout.fonts
  const fs = (k: keyof Layout['fonts']): CSSProperties => ({ ...fontCss(F[k]), whiteSpace: F[k].wrap ? 'normal' : 'nowrap' })
  const nf = layout.num
  const cell = (r: ReportRow, c: ColId) => {
    if (r.cur === undefined) return ''
    const prev = r.prev ?? 0
    if (c === 'pct') return prev ? `${fmtNum(((r.cur - prev) / Math.abs(prev)) * 100, { ...nf, dp: 1 })}%` : '—'
    return fmtNum(c === 'cur' ? r.cur : c === 'prev' ? prev : r.cur - prev, nf)
  }
  const isNeg = (r: ReportRow, c: ColId) => nf.red && r.cur !== undefined && (c === 'cur' ? r.cur : c === 'prev' ? (r.prev ?? 0) : r.cur - (r.prev ?? 0)) < 0
  const [pw, ph] = paperMm[layout.page.size] ?? paperMm.A4
  const [w, h] = layout.page.ori === 'l' ? [ph, pw] : [pw, ph]
  const m = layout.page.mar
  const period = search.from ? `${fmtDate(search.from, nf.df)} – ${fmtDate(search.to, nf.df)}` : fmtDate(search.to, nf.df)
  const meta = [
    { k: t(search.from ? tx.period : tx.asOf), v: period },
    { k: t(tx.branch), v: search.branch.replaceAll(',', ', ') },
    { k: t(tx.cur), v: search.cur.replaceAll(',', ', ') },
    { k: t(tx.basis), v: t(tx.accrual) },
  ]
  const head = layout.show.head
  const foot = layout.show.foot
  const tbtn = 'flex size-[34px] cursor-pointer items-center justify-center rounded-full transition-[background] duration-150 hover:bg-[rgba(var(--fg),.14)]'
  const sep = <span className="mx-1 h-[18px] w-px bg-[rgba(var(--fg),.18)]" />

  return (
    <div data-screen-label="Report view" className="flex min-h-0 flex-1 animate-[fade_.25s] flex-col gap-3.5 pt-[18px] pb-6" style={{ paddingInline: isDesktop ? 40 : isMobile ? 16 : 24 }}>
      <div className="flex flex-none flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[.5px] opacity-60">{cat ? t(cat.name) : ''}</div>
          <h1 className={cn('mt-1 tracking-[-.3px]', isDesktop ? 'text-[30px]' : isMobile ? 'text-[24px]' : 'text-[28px]')}>{name}</h1>
          {rows.some((r) => r.k === 'acc' && r.code) && (
            <div className="mt-1.5 flex items-center gap-1.5 text-[11.5px] opacity-60">
              <i className="ph-light ph-magnifying-glass-plus text-[14px]" />
              {t(tx.hint)}
            </div>
          )}
        </div>
        <div className="box-border flex max-w-full flex-wrap items-center gap-0.5 rounded-[21px] border border-[rgba(var(--fg),.12)] bg-[rgba(var(--fg),.08)] p-1">
          <Link to="/reports" title={L.rpBack} aria-label={L.rpBack} className={tbtn}>
            <i className="ph-light ph-arrow-left text-[18px]" />
          </Link>
          <button type="button" title={t(tx.refresh)} aria-label={t(tx.refresh)} className={cn(tbtn, loading && 'bg-[rgba(var(--fg),.14)]')} onClick={() => rowsQ.refetch()}>
            <i className="ph-light ph-arrows-clockwise text-[18px]" style={{ animation: loading ? 'spin 1s linear infinite' : undefined }} />
          </button>
          <button type="button" title={t(tx.layout)} aria-label={t(tx.layout)} className={cn(tbtn, md && 'bg-[rgba(var(--fg),.14)]')} onClick={() => setMd(true)}>
            <i className="ph-light ph-layout text-[18px]" />
          </button>
          <button type="button" title={t(tx.print)} aria-label={t(tx.print)} className={tbtn} onClick={() => window.print()}>
            <i className="ph-light ph-printer text-[18px]" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" title={L.rpTbExport} aria-label={L.rpTbExport} className="flex h-[34px] cursor-pointer items-center gap-[5px] rounded-[17px] px-2.5 hover:bg-[rgba(var(--fg),.14)] data-[state=open]:bg-[rgba(var(--fg),.14)]">
                <i className="ph-light ph-export text-[18px]" />
                <i className="ph-light ph-caret-down text-[11px]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8} className="glass-pop font-light w-[190px] rounded-[16px] p-1.5 text-(--ink)">
              {exps.map((x) => (
                <DropdownMenuItem key={x.name} onSelect={() => showToast(`${t(tx.exp)} ${name} (${x.name})…`)} className="cursor-pointer gap-2.5 rounded-[10px] px-2.5 py-[9px] text-[12.5px] text-(--ink) focus:bg-[rgba(var(--fg),.1)] focus:text-(--ink)">
                  <i className={cn(x.icon, 'text-[16px] opacity-80')} />
                  {x.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {sep}
          <button type="button" title={L.rpTbOut} aria-label={L.rpTbOut} className={tbtn} onClick={() => setZoom((z) => Math.max(0.3, +(z - 0.1).toFixed(2)))}>
            <i className="ph-light ph-magnifying-glass-minus text-[18px]" />
          </button>
          <span className="min-w-10 text-center text-[11.5px] tabular-nums opacity-75">{Math.round(zoom * 100)}%</span>
          <button type="button" title={L.rpTbIn} aria-label={L.rpTbIn} className={tbtn} onClick={() => setZoom((z) => Math.min(2, +(z + 0.1).toFixed(2)))}>
            <i className="ph-light ph-magnifying-glass-plus text-[18px]" />
          </button>
          {sep}
          <button type="button" title={L.rpTbAi} aria-pressed={ai} className={cn('flex h-[34px] cursor-pointer items-center gap-1.5 rounded-[17px] px-3 text-[12px] hover:bg-[rgba(var(--fg),.14)]', ai && 'bg-[rgba(var(--fg),.16)]')} onClick={() => setAi(!ai)}>
            <i className="ph-light ph-sparkle text-[17px]" />
            AI
          </button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 gap-3.5" style={{ flexDirection: isMobile ? 'column' : 'row' }}>
        <div className={cn('box-border flex min-h-[420px] min-w-0 flex-1 items-start overflow-auto rounded-[24px] border border-[rgba(var(--fg),.1)] bg-[rgba(var(--fg),.05)] shadow-[inset_0_2px_14px_rgba(0,0,0,.22)]', isMobile ? 'p-3' : 'p-7')}>
          <div
            data-rp-paper="1"
            className="relative mx-auto box-border flex flex-none flex-col rounded-[6px] bg-white text-[12.5px] leading-normal font-normal text-[#18181b] shadow-[0_18px_48px_rgba(0,0,0,.35)]"
            style={{ width: layout.page.flex ? '100%' : w * MM, minHeight: layout.page.flex ? undefined : h * MM, padding: `${m.t * MM}px ${m.r * MM}px ${m.b * MM}px ${m.l * MM}px`, zoom, fontFamily: 'Outfit,sans-serif' }}
          >
            {loading && (
              <div className="absolute inset-x-0 top-0 z-[2] h-[3px] overflow-hidden rounded-t-[6px]">
                <div className="h-full bg-[linear-gradient(90deg,#4338ca,#a855f7,#ec4899)] shadow-[0_0_10px_rgba(236,72,153,.6)]" style={{ animation: 'prog 1.6s cubic-bezier(.4,0,.2,1) forwards' }} />
              </div>
            )}
            {head && layout.show.co && (
              <div className="flex items-center gap-2.5" style={{ justifyContent: F.co.ta === 'center' ? 'center' : F.co.ta === 'right' ? 'flex-end' : 'flex-start' }}>
                <span className="flex size-[30px] flex-none items-center justify-center rounded-[8px] bg-[#18181b] text-[11.5px] font-semibold tracking-[.3px] text-white">HN</span>
                <span style={fontCss(F.co)}>PT Harbor Nusantara</span>
              </div>
            )}
            {head && layout.show.sub && <div className="mt-7 text-[10.5px] font-medium uppercase tracking-[.9px] text-[#4338ca]">{cat ? t(cat.name) : ''}</div>}
            {head && layout.show.ti && (
              <div className="mt-1.5 leading-[1.15] tracking-[-.5px] text-pretty" style={fontCss(F.ti)}>
                {layout.text.ti || name}
              </div>
            )}
            {head && layout.show.fil && (
              <div className="mt-5 grid grid-cols-4 gap-4 border-y border-[#e4e4e7] py-3">
                {meta.map((x) => (
                  <div key={x.k} className="min-w-0">
                    <div className="text-[9.5px] uppercase tracking-[.7px] text-[#71717a]">{x.k}</div>
                    <div className="mt-[3px] [overflow-wrap:anywhere]" style={fontCss(F.fil)}>
                      {x.v}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {rowsQ.isError && <div className="mt-7 text-[#dc2626]">{rowsQ.error.message}</div>}
            {tabular ? <GridTable grid={tabular} /> : <>
            {head && layout.show.colT && (
              <div className="mt-7 grid gap-x-3.5 border-b border-[#18181b] uppercase tracking-[.7px]" style={{ gridTemplateColumns: grid, ...fontCss(F.col), textAlign: undefined }}>
                {pre.map((c) => (
                  <span key={c.id} className="pb-1.5 pl-2 whitespace-nowrap">
                    {colName(c)}
                  </span>
                ))}
                <span className="pb-1.5 pl-2">{L.rpDesc}</span>
                {num.map((c) => (
                  <span key={c.id} className="pr-2 pb-1.5 text-right whitespace-nowrap">
                    {colName(c)}
                  </span>
                ))}
              </div>
            )}
            <div className="relative mt-1.5 flex flex-col">
              {loading && (
                <div className="pointer-events-none absolute inset-0 animate-[fade_.2s] overflow-hidden">
                  <div className="absolute inset-x-0 top-[-60px] h-[60px] border-b-[1.5px] border-[#8b5cf6] bg-[linear-gradient(180deg,rgba(99,102,241,0),rgba(99,102,241,.07)_75%,rgba(236,72,153,.12))] shadow-[0_6px_16px_-6px_rgba(236,72,153,.7)]" style={{ animation: 'scan 1.6s cubic-bezier(.45,0,.55,1) infinite' }} />
                </div>
              )}
              <div className="flex flex-col">
                {rows.map((r, i) => {
                  const sk = loading ? skel : undefined
                  const font = fs(r.k)
                  return (
                    <div
                      key={`${i}-${r.t}`}
                      className="grid items-center gap-x-3.5"
                      style={{ gridTemplateColumns: grid, ...rowKind[r.k], ...font, textAlign: undefined, animation: loading ? undefined : `rowin .5s cubic-bezier(.2,.7,.2,1) ${Math.min(i, 28) * 24}ms both` }}
                    >
                      {pre.map((c) => (
                        <span key={c.id} className="py-1 pl-2 whitespace-nowrap tabular-nums text-[#52525b]">
                          <span style={sk}>{r.code}</span>
                        </span>
                      ))}
                      <span className="min-w-0 overflow-hidden py-1 text-ellipsis" style={{ paddingLeft: r.k === 'acc' && opts.includes('ind') ? 22 : 8, textAlign: F[r.k].ta, whiteSpace: font.whiteSpace }}>
                        <span style={sk}>{r.t}</span>
                      </span>
                      {num.map((c) =>
                        r.k === 'acc' && r.code && !loading ? (
                          <button
                            key={c.id}
                            type="button"
                            title={`${t(tx.drill)} ${r.t}`}
                            onClick={() => setDrill(r)}
                            className="cursor-zoom-in rounded-[6px] px-2 py-1 text-right whitespace-nowrap tabular-nums transition-[background,color] duration-[.12s] hover:bg-[#eef2ff] hover:!text-[#4338ca]"
                            style={{ color: isNeg(r, c.id) ? '#dc2626' : undefined }}
                          >
                            {cell(r, c.id)}
                          </button>
                        ) : (
                          <span key={c.id} className="px-2 py-1 text-right whitespace-nowrap tabular-nums" style={{ color: isNeg(r, c.id) ? '#dc2626' : undefined }}>
                            <span style={sk}>{cell(r, c.id)}</span>
                          </span>
                        ),
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            </>}
            <div className="mt-auto flex flex-col gap-2 pt-12">
              {foot && layout.show.add && layout.text.add && <div style={fontCss(F.add)}>{layout.text.add}</div>}
              {foot && (
                <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3 border-t border-[#e4e4e7] pt-2.5">
                  <span style={fontCss(F.pd)}>{layout.show.pd ? t(tx.printed) : ''}</span>
                  <span style={{ ...fontCss(F.pd), textAlign: 'center' }}>{layout.show.sys ? layout.text.sys : ''}</span>
                  <span style={fontCss(F.pn)}>{layout.show.pn ? t(tx.page) : ''}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        {ai && rep && <AiPanel report={name} onClose={() => setAi(false)} />}
      </div>
      {drill && <DrillDialog code={drill.code!} name={drill.t} search={search} onClose={() => setDrill(null)} />}
      {md && <LayoutDialog open onClose={() => setMd(false)} id={id} name={name} layout={layout} cols={cols} rows={apiRows ?? []} />}
    </div>
  )
}

const numeric = /^-?[\d.]+(,\d+)?$/
/**
 * Accurate's tabular reports as the API returns them. The widest row sets the column count; a one-cell row is a group
 * heading; a shorter all-number row is a subtotal, so it is pushed right to sit under the number columns.
 */
function GridTable({ grid }: { grid: string[][] }) {
  const n = Math.max(1, ...grid.map((r) => r.length))
  return (
    <table className="mt-7 w-full border-collapse text-[11.5px]">
      <tbody>
        {grid.map((r, i) => {
          const cells = r.length > 1 && r.length < n && r.every((c) => numeric.test(c)) ? [...Array<string>(n - r.length).fill(''), ...r] : r
          return (
            <tr key={i} className={cn(i === 0 && 'border-b border-[#18181b] uppercase tracking-[.5px]', r.length === 1 && 'font-medium')}>
              {r.length === 1 ? (
                <td colSpan={n} className="px-2 pt-3 pb-1">{r[0]}</td>
              ) : (
                cells.map((c, j) => (
                  <td key={j} className={cn('px-2 py-1 align-top', numeric.test(c) && 'text-right whitespace-nowrap tabular-nums', c.startsWith('-') && numeric.test(c) && 'text-[#dc2626]')}>
                    {c}
                  </td>
                ))
              )}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
