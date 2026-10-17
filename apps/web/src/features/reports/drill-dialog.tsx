import { idr } from '@northline/schemas/fixtures'
import { useQuery } from '@tanstack/react-query'
import { drillQuery } from '@/api/reports'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useShell, useT } from '@/lib/shell'
import { cn } from '@/lib/utils'
import { modal, xBtn } from './ui'

const tx = {
  kicker: { id: 'Rincian transaksi', en: 'Transactions' },
  date: { id: 'Tanggal', en: 'Date' },
  no: { id: 'No. Sumber', en: 'Source No.' },
  desc: { id: 'Keterangan', en: 'Description' },
  dr: { id: 'Debit', en: 'Debit' },
  cr: { id: 'Kredit', en: 'Credit' },
  none: { id: 'Tidak ada transaksi pada periode ini', en: 'No transactions in this period' },
  total: { id: 'Total', en: 'Total' },
}

export function DrillDialog({ code, name, search, onClose }: { code: string; name: string; search: { from?: string; to: string }; onClose: () => void }) {
  const { isMobile } = useShell()
  const t = useT()
  const { data } = useQuery(drillQuery(code, search))
  const sum = (k: 'debit' | 'credit') => (data ?? []).reduce((s, l) => s + l[k], 0)
  const cols = isMobile ? 'minmax(0,1fr) 92px 92px' : '86px 150px minmax(0,1fr) 110px 110px'
  const row = 'grid items-center gap-x-3 px-3.5 py-2.5 text-[12.5px]'
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent showCloseButton={false} className={cn(modal, 'flex max-h-[calc(100%-32px)] w-[min(820px,calc(100%-32px))] flex-col gap-0', isMobile ? 'p-5' : 'p-7')} data-screen-label="Report drill-down">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[.5px] opacity-60">{t(tx.kicker)}</div>
            <DialogTitle className="mt-1.5 text-[22px] font-light leading-[1.2]">
              {code} · {name}
            </DialogTitle>
          </div>
          <button type="button" aria-label="×" className={xBtn} onClick={onClose}>
            ×
          </button>
        </div>
        <div className="mt-5 min-h-0 overflow-y-auto rounded-[16px] border border-[rgba(var(--fg),.12)]">
          <div className={cn(row, 'sticky top-0 border-b border-[rgba(var(--fg),.12)] bg-(--panel) text-[10.5px] uppercase tracking-[.5px] opacity-70')} style={{ gridTemplateColumns: cols }}>
            {!isMobile && <span>{t(tx.date)}</span>}
            {!isMobile && <span>{t(tx.no)}</span>}
            <span>{t(tx.desc)}</span>
            <span className="text-right">{t(tx.dr)}</span>
            <span className="text-right">{t(tx.cr)}</span>
          </div>
          {!data && Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="m-3.5 h-4 bg-[rgba(var(--fg),.1)]" />)}
          {data?.map((l, i) => (
            <div key={i} className={cn(row, 'border-b border-[rgba(var(--fg),.08)] animate-[fade_.2s]')} style={{ gridTemplateColumns: cols }}>
              {!isMobile && <span className="tabular-nums opacity-75">{l.date}</span>}
              {!isMobile && (
                <span className="min-w-0">
                  <span className="block truncate">{l.no}</span>
                  {l.jv !== l.no && <span className="block truncate text-[11px] opacity-55">{l.jv}</span>}
                </span>
              )}
              <span className="min-w-0">
                <span className="block truncate">{l.desc}</span>
                <span className="block truncate text-[11px] opacity-55">{isMobile ? `${l.date} · ${l.no}` : l.source}</span>
              </span>
              <span className="text-right tabular-nums">{l.debit ? idr(l.debit) : ''}</span>
              <span className="text-right tabular-nums">{l.credit ? idr(l.credit) : ''}</span>
            </div>
          ))}
          {data && !data.length && <div className="px-3.5 py-6 text-center text-[12.5px] opacity-60">{t(tx.none)}</div>}
          {data && data.length > 0 && (
            <div className={cn(row, 'font-medium')} style={{ gridTemplateColumns: cols }}>
              <span style={{ gridColumn: isMobile ? 'span 1' : 'span 3' }}>{t(tx.total)}</span>
              <span className="text-right tabular-nums">{idr(sum('debit'))}</span>
              <span className="text-right tabular-nums">{idr(sum('credit'))}</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
