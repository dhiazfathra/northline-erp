import { idr } from '@northline/schemas/fixtures'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { banksQuery, useMatchEntry } from '@/api/ledger'
import { Dropdown } from '@/components/dropdown'
import { useShell, useT } from '@/lib/shell'
import { cn } from '@/lib/utils'
import { Frame, btnInk, btnOutline } from './ui'

const dateBox = 'rounded-[14px] border border-[rgba(var(--fg),.18)] bg-[rgba(var(--fg),.06)] px-3.5 py-[11px] text-[13px] tabular-nums'
const grid = 'grid grid-cols-[86px_150px_minmax(140px,1fr)_110px_110px_minmax(190px,.9fr)] items-center gap-3'
const num = 'text-right whitespace-nowrap tabular-nums'

export function Reconciliation() {
  const t = useT()
  const { refresh, refreshing } = useShell()
  const { data } = useQuery(banksQuery)
  const match = useMatchEntry()
  const [bank, setBank] = useState('')
  const [ask, setAsk] = useState<string | null>(null)
  const b = data?.find((x) => x.name === bank)
  const open = b?.entries.filter((e) => !e.matched).length ?? 0
  const net = b?.entries.reduce((s, e) => s + (e.side === 'debit' ? e.amount : -e.amount), 0) ?? 0

  return (
    <Frame>
      <div data-screen-label="Rekonsiliasi Bank" className="flex flex-col gap-3.5">
        <div className="flex flex-wrap items-end gap-2.5">
          <label className="flex min-w-[200px] flex-[0_1_280px] flex-col gap-1.5 text-[11px]">
            <span className="opacity-80">
              Bank <span className="text-[#ec4899]">*</span>
            </span>
            <Dropdown value={bank} options={data?.map((x) => x.name) ?? []} onSelect={setBank} />
          </label>
          <span className={dateBox}>01/09/2026</span>
          <span className="pb-3 text-xs">s/d</span>
          <span className={dateBox}>17/10/2026</span>
          <button type="button" onClick={refresh} className={btnOutline}>
            <i className="ph-light ph-arrows-clockwise" />
            Refresh
          </button>
        </div>
        <div className="flex items-center gap-1.5 text-xs opacity-75">
          <i className="ph-light ph-info" />
          {t({ id: 'Klik Refresh untuk memuat ulang transaksi setelah ada jurnal baru.', en: 'Click Refresh to reload entries after new journals are posted.' })}
        </div>
        {!b ? (
          <div className="glass-card p-7 text-center text-[13px] leading-normal">
            {t({ id: 'Pilih bank terlebih dahulu untuk menampilkan mutasi yang perlu direkonsiliasi.', en: 'Choose a bank first to show the entries to reconcile.' })}
          </div>
        ) : (
          <div className="glass-card flex flex-col gap-2.5 px-5 py-[18px]">
            <div className="flex flex-wrap items-baseline justify-between gap-2.5">
              <span className={cn('flex items-center gap-1.5 text-[13px]', !open && 'text-[#22c55e]')}>
                <i className={open ? 'ph-light ph-link-break' : 'ph-light ph-check-circle'} />
                {t({ id: `${open} data belum cocok`, en: `${open} entries not matched` })}
              </span>
              <span className="text-[13px] tabular-nums">
                {t({ id: 'Saldo buku', en: 'Book balance' })} Rp {idr(b.balance)}
              </span>
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-[860px] text-[12.5px]">
                <div className={cn(grid, 'border-b border-[rgba(var(--fg),.2)] pb-1 text-[11px] tracking-[.5px]')}>
                  <span className="col-span-5">JURNAL ACCURATE</span>
                  <span className="border-l border-[rgba(var(--fg),.15)] pl-3">REKENING BANK</span>
                </div>
                <div className={cn(grid, 'border-b border-[rgba(var(--fg),.12)] py-2 text-[11px] opacity-75')}>
                  <span>{t({ id: 'Tanggal', en: 'Date' })}</span>
                  <span>{t({ id: 'No. Sumber', en: 'Source No.' })}</span>
                  <span>{t({ id: 'Keterangan', en: 'Description' })}</span>
                  <span className="text-right">Debit</span>
                  <span className="text-right">{t({ id: 'Kredit', en: 'Credit' })}</span>
                  <span className="pl-3">Status</span>
                </div>
                {b.entries.map((e) => (
                  <div key={e.id} style={{ opacity: refreshing ? 0.35 : 1 }} className={cn(grid, 'min-h-[52px] border-b border-[rgba(var(--fg),.07)] py-2 transition-opacity duration-[.25s]')}>
                    <span className="tabular-nums">{e.date}</span>
                    <span className="truncate tabular-nums">{e.no}</span>
                    <span className="min-w-0">
                      <div className="truncate">{e.party}</div>
                      <div className="text-[11px] opacity-60">{e.type}</div>
                    </span>
                    <span className={num}>{e.side === 'debit' ? idr(e.amount) : ''}</span>
                    <span className={num}>{e.side === 'credit' ? idr(e.amount) : ''}</span>
                    <span className="pl-3">
                      {e.matched ? (
                        <span className="flex items-center gap-1.5 text-[#22c55e]">
                          <i className="ph-light ph-check-circle" />
                          {t({ id: 'Cocok', en: 'Matched' })}
                        </span>
                      ) : ask === e.id ? (
                        <span role="alertdialog" aria-label={t({ id: 'Konfirmasi', en: 'Confirm' })} className="flex items-center gap-1.5">
                          <button
                            type="button"
                            autoFocus
                            disabled={match.isPending}
                            onClick={() => match.mutate(e.id, { onSuccess: () => setAsk(null) })}
                            className={cn(btnInk, 'px-3 py-[5px] text-xs')}
                          >
                            {t({ id: 'Konfirmasi', en: 'Confirm' })}
                          </button>
                          <button type="button" onClick={() => setAsk(null)} className={cn(btnOutline, 'px-3 py-[5px] text-xs')}>
                            {t({ id: 'Batal', en: 'Cancel' })}
                          </button>
                        </span>
                      ) : (
                        <button type="button" onClick={() => setAsk(e.id)} className={cn(btnOutline, 'px-3 py-1.5 text-xs')}>
                          {t({ id: 'Ada di Rekening Koran', en: 'On bank statement' })}
                        </button>
                      )}
                    </span>
                  </div>
                ))}
                {b.entries.length === 0 && <div className="py-4 text-center opacity-80">{t({ id: 'Tidak ada data mutasi kas/bank yang tersedia', en: 'No cash/bank entries available' })}</div>}
                <div className={cn(grid, 'border-t-2 border-[rgba(var(--fg),.3)] py-[11px] font-medium')}>
                  <span className="col-span-3">
                    Total · {b.entries.length} {t({ id: 'data', en: 'entries' })}
                  </span>
                  <span className={cn(num, 'col-span-2')}>{idr(net)}</span>
                  <span />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Frame>
  )
}
