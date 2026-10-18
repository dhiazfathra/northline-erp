import { idr } from '@northline/schemas/fixtures'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { banksQuery, useMatchEntry } from '@/api/ledger'
import { Dropdown } from '@/components/dropdown'
import { useShell, useT } from '@/lib/shell'
import { cn } from '@/lib/utils'
import { Frame, btnInk, btnOutline } from './ui'

const dateBox = 'rounded-[14px] border border-[rgba(var(--fg),.18)] bg-[rgba(var(--fg),.06)] px-3.5 py-[11px] text-[13px] tabular-nums'

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
          <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] items-start gap-3.5">
            <div className="glass-card flex flex-col gap-2.5 px-5 py-[18px]">
              <div className="flex flex-wrap items-baseline justify-between gap-2.5">
                <span className="text-xs tracking-[.5px]">JURNAL ACCURATE</span>
                <span className="text-[13px] tabular-nums">
                  {t({ id: 'Saldo buku', en: 'Book balance' })} Rp {idr(b.balance)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <i className={open ? 'ph-light ph-link-break' : 'ph-light ph-check-circle'} />
                {t({ id: `${open} data belum cocok`, en: `${open} entries not matched` })}
              </div>
              {b.entries
                .filter((e) => !e.matched)
                .map((e) => (
                  <div key={e.id} data-rf-row="1" style={{ opacity: refreshing ? 0.35 : 1 }} className="flex flex-col gap-1.5 border-t border-[rgba(var(--fg),.1)] pt-2.5 transition-opacity duration-[.25s]">
                    <div className="flex justify-between gap-2.5 text-[13px]">
                      <span className="flex items-center gap-1.5 tabular-nums">
                        <i className={e.side === 'debit' ? 'ph-light ph-arrow-down-left' : 'ph-light ph-arrow-up-right'} aria-hidden="true" />
                        {e.date} ({e.side === 'debit' ? 'Dr' : 'Cr'})
                      </span>
                      <span className="tabular-nums">{idr(e.amount)}</span>
                    </div>
                    <div className="text-xs opacity-85">
                      {e.type} · {e.no} · {e.party}
                    </div>
                    {ask === e.id ? (
                      <div role="alertdialog" aria-label={t({ id: 'Konfirmasi', en: 'Confirm' })} className="flex flex-wrap items-center gap-2 rounded-xl bg-[rgba(var(--fg),.08)] px-2.5 py-2 text-xs">
                        <span>{t({ id: 'Konfirmasi: tandai ada di rekening koran?', en: 'Confirm: mark as present on the bank statement?' })}</span>
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
                      </div>
                    ) : (
                      <button type="button" onClick={() => setAsk(e.id)} className={cn(btnOutline, 'self-start px-3 py-1.5 text-xs')}>
                        {t({ id: 'Ada di Rekening Koran', en: 'On bank statement' })}
                      </button>
                    )}
                  </div>
                ))}
              {!open && <div className="py-2 text-[12.5px] opacity-80">{t({ id: 'Tidak ada data mutasi kas/bank yang tersedia', en: 'No cash/bank entries available' })}</div>}
              <div className="flex justify-between gap-2.5 border-t-2 border-[rgba(var(--fg),.3)] pt-2.5 text-[13px] font-medium">
                <span>
                  Total · {b.entries.length} {t({ id: 'data', en: 'entries' })}
                </span>
                <span className="tabular-nums">{idr(net)}</span>
              </div>
            </div>
            <div className="glass-card flex flex-col gap-2.5 px-5 py-[18px]">
              <span className="text-xs tracking-[.5px]">REKENING BANK</span>
              <div className="text-[12.5px] opacity-80">{t({ id: 'Tidak ada data mutasi kas/bank yang tersedia', en: 'No cash/bank entries available' })}</div>
              {b.entries.some((e) => e.matched) && (
                <div className="flex flex-col gap-1.5 border-t border-[rgba(var(--fg),.1)] pt-2.5">
                  <span className="flex items-center gap-1.5 text-xs">
                    <i className="ph-light ph-check-circle text-[#22c55e]" />
                    {t({ id: `${b.entries.length - open} data cocok`, en: `${b.entries.length - open} entries matched` })}
                  </span>
                  {b.entries
                    .filter((e) => e.matched)
                    .map((e) => (
                      <div key={e.id} data-rf-row="1" className="flex justify-between gap-2.5 text-xs opacity-85">
                        <span>
                          {e.date} · {e.no}
                        </span>
                        <span className="tabular-nums">{idr(e.amount)}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Frame>
  )
}
