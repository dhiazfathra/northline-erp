import { journalAdjustSchema, type JournalAdjustInput, type TbAccount } from '@northline/schemas/ledger'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { Dialog, RadioGroup } from 'radix-ui'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { trialBalanceQuery } from '@/api/ledger'
import { useShell, useT } from '@/lib/shell'
import { cn } from '@/lib/utils'
import { Frame, Seg, fmt, overlayCls, panelCls } from './ui'

const grid = 'grid grid-cols-[80px_minmax(160px,1.6fr)_repeat(6,minmax(0,1fr))] gap-2.5'
const num = 'text-right whitespace-nowrap tabular-nums'
const cell = (n: number) => (n ? fmt(n) : '0')

/** [opening D, opening C, mutation D, mutation C, ending D, ending C] */
function values(a: TbAccount) {
  const end = a.opening + a.debit - a.credit
  return [Math.max(a.opening, 0), Math.max(-a.opening, 0), a.debit, a.credit, Math.max(end, 0), Math.max(-end, 0)]
}

export function TrialBalance() {
  const t = useT()
  const { refreshing } = useShell()
  const { data, isPending } = useQuery(trialBalanceQuery)
  const [sel, setSel] = useState<TbAccount | null>(null)
  const rows = (data ?? []).map((a) => ({ a, v: values(a) }))
  const tot = [0, 1, 2, 3, 4, 5].map((i) => rows.reduce((s, r) => s + r.v[i], 0))
  const ok = !isPending && tot[0] === tot[1] && tot[2] === tot[3] && tot[4] === tot[5]
  const groups = [t({ id: 'Saldo Awal', en: 'Opening' }), t({ id: 'Mutasi', en: 'Movement' }), t({ id: 'Saldo Akhir', en: 'Ending' })]

  return (
    <Frame>
      <div data-screen-label="Neraca Percobaan" className="glass-card flex flex-col gap-3.5 px-[22px] py-5">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div>
            <div className="text-[11px] tracking-[.5px] uppercase opacity-70">{t({ id: 'Buku Besar', en: 'General Ledger' })}</div>
            <div className="mt-1 text-[22px]">{t({ id: 'Neraca Percobaan', en: 'Trial Balance' })}</div>
          </div>
          <span className="rounded-[18px] border border-[rgba(var(--fg),.2)] px-3.5 py-2 text-xs">01/10/2026 – 17/10/2026</span>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[900px] text-[12.5px]">
            <div className={cn(grid, 'border-b border-[rgba(var(--fg),.12)] py-2 text-[11px] opacity-80')}>
              <span />
              <span />
              {groups.map((g) => (
                <span key={g} className="col-span-2 border-b border-[rgba(var(--fg),.2)] pb-1 text-center">
                  {g}
                </span>
              ))}
            </div>
            <div className={cn(grid, 'border-b border-[rgba(var(--fg),.12)] py-2 text-[11px] opacity-80')}>
              <span>{t({ id: 'Kode', en: 'Code' })}</span>
              <span>{t({ id: 'Nama', en: 'Name' })}</span>
              {groups.flatMap((g) => [
                <span key={g + 'd'} className="text-right">
                  Debit
                </span>,
                <span key={g + 'c'} className="text-right">
                  {t({ id: 'Kredit', en: 'Credit' })}
                </span>,
              ])}
            </div>
            {isPending &&
              Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="border-b border-[rgba(var(--fg),.07)] py-3">
                  <div className="h-3 animate-[shim_1.2s_linear_infinite] rounded-md bg-[linear-gradient(90deg,rgba(var(--fg),.06),rgba(var(--fg),.16),rgba(var(--fg),.06))] bg-[length:200%_100%]" />
                </div>
              ))}
            {rows.map(({ a, v }) => (
              <button
                key={a.code}
                type="button"
                onClick={() => setSel(a)}
                style={{ opacity: refreshing ? 0.35 : 1 }}
                className={cn(grid, 'w-full cursor-pointer border-b border-[rgba(var(--fg),.07)] py-[9px] text-left transition-opacity duration-[.25s] hover:bg-[rgba(var(--fg),.06)]')}
              >
                <span className="tabular-nums">{a.code}</span>
                <span>{a.name}</span>
                {v.map((x, i) => (
                  <span key={i} className={num}>
                    {cell(x)}
                  </span>
                ))}
              </button>
            ))}
            <div className={cn(grid, 'border-t-2 border-[rgba(var(--fg),.3)] py-[11px] font-medium')}>
              <span />
              <span>Total</span>
              {tot.map((x, i) => (
                <span key={i} className={num}>
                  {cell(x)}
                </span>
              ))}
            </div>
          </div>
        </div>
        {ok && (
          <div className="flex items-center gap-2 self-end text-[12.5px]">
            <i className="ph-light ph-scales text-[18px] text-[#22c55e]" />
            {t({ id: 'Neraca seimbang', en: 'Balanced' })}
            <span className="rounded-[10px] border border-[#f0b44c] px-2 py-0.5 text-[10.5px]">proposal</span>
          </div>
        )}
      </div>
      <EntryDialog account={sel} onClose={() => setSel(null)} />
    </Frame>
  )
}

function EntryDialog({ account, onClose }: { account: TbAccount | null; onClose: () => void }) {
  const t = useT()
  const { showToast } = useShell()
  const [tab, setTab] = useState('d')
  const { register, control, handleSubmit, formState, reset } = useForm<JournalAdjustInput>({
    resolver: zodResolver(journalAdjustSchema),
    defaultValues: { side: 'debit', amount: '', note: '' },
  })
  const err = !!formState.errors.amount
  const close = () => {
    onClose()
    reset()
    setTab('d')
  }
  const go = handleSubmit(
    (v) => {
      showToast(t({ id: `${v.side === 'debit' ? 'Debit' : 'Kredit'} Rp ${v.amount} dicatat ke ${account?.code}`, en: `${v.side === 'debit' ? 'Debit' : 'Credit'} Rp ${v.amount} posted to ${account?.code}` }))
      close()
    },
    () => setTab('d'),
  )
  const sides = [
    { id: 'debit', n: 'Debit' },
    { id: 'credit', n: t({ id: 'Kredit', en: 'Credit' }) },
  ]

  return (
    <Dialog.Root open={!!account} onOpenChange={(o) => !o && close()}>
      <Dialog.Portal>
        <Dialog.Overlay className={cn(overlayCls, 'z-[89]')} />
        <Dialog.Content aria-describedby={undefined} className={cn(panelCls, 'z-[90] w-[min(480px,calc(100%-32px))] gap-4')}>
          <form onSubmit={go} className="contents">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] tracking-[.5px] uppercase opacity-70">{t({ id: 'Rincian Jurnal', en: 'Journal Detail' })}</div>
                <Dialog.Title className="mt-1.5 text-[20px] leading-[1.25] font-light">
                  {account?.code} · {account?.name}
                </Dialog.Title>
              </div>
              <Dialog.Close aria-label={t({ id: 'Tutup', en: 'Close' })} className="size-8 flex-none cursor-pointer rounded-full border-none bg-[rgba(var(--fg),.1)] text-base text-(--ink)">
                ×
              </Dialog.Close>
            </div>
            <Seg
              items={[
                { id: 'd', n: t({ id: 'Rincian', en: 'Detail' }) },
                { id: 'i', n: t({ id: 'Info Lainnya', en: 'Other Info' }) },
              ]}
              value={tab}
              onChange={setTab}
            />
            <div className={cn('flex flex-col gap-2 text-[11px]', tab !== 'd' && 'hidden')}>
              <span className="opacity-75">
                {t({ id: 'Nilai', en: 'Amount' })} <span className="text-[#ec4899]">*</span>
              </span>
              <Controller
                control={control}
                name="side"
                render={({ field }) => (
                  <RadioGroup.Root value={field.value} onValueChange={field.onChange} aria-label={t({ id: 'Sisi', en: 'Side' })} className="flex gap-4">
                    {sides.map((x) => (
                      <label key={x.id} className="flex cursor-pointer items-center gap-2 text-[13px]">
                        <RadioGroup.Item value={x.id} className="flex size-4 cursor-pointer items-center justify-center rounded-full border border-(--ink)">
                          <RadioGroup.Indicator className="size-2 rounded-full bg-(--ink)" />
                        </RadioGroup.Item>
                        {x.n}
                      </label>
                    ))}
                  </RadioGroup.Root>
                )}
              />
              <div className="flex items-center gap-2">
                <span className="text-xs opacity-75">Rp</span>
                <input
                  {...register('amount')}
                  inputMode="numeric"
                  placeholder="0"
                  aria-invalid={err || undefined}
                  aria-describedby="le-amt-err"
                  className={cn(
                    'box-border min-w-0 flex-1 rounded-[14px] bg-[rgba(var(--fg),.06)] px-3.5 py-[11px] text-right text-sm text-(--ink) tabular-nums outline-none',
                    err ? 'border border-[#f472b6]' : 'border border-[rgba(var(--fg),.18)]',
                  )}
                />
              </div>
              {err && (
                <span id="le-amt-err" className="flex items-center gap-1 text-[11.5px] text-[#f472b6]">
                  <i className="ph-light ph-warning-circle" />
                  {t({ id: 'Nilai harus diisi', en: 'Amount is required' })}
                </span>
              )}
            </div>
            {tab === 'i' && (
              <label className="flex flex-col gap-1.5 text-[11px]">
                <span className="opacity-75">{t({ id: 'Catatan', en: 'Note' })}</span>
                <textarea {...register('note')} rows={3} className="field resize-y px-3.5 py-[11px]" />
              </label>
            )}
            <div className="flex justify-end">
              <button type="submit" className="cursor-pointer rounded-[20px] border-none bg-(--ink) px-5 py-2.5 text-[13px] text-(--paper)">
                {t({ id: 'Lanjut', en: 'Continue' })}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
