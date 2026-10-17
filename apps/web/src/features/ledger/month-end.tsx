import { monthEndSchema, type MonthEndInput } from '@northline/schemas/ledger'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { monthEndRunsQuery, useRunMonthEnd } from '@/api/ledger'
import { Dropdown } from '@/components/dropdown'
import { useShell, useT } from '@/lib/shell'
import { cn } from '@/lib/utils'
import { idr as fmt } from '@northline/schemas/fixtures'
import { Confirm, ConfirmAction, Frame, Seg, btnInk, btnOutline } from './ui'

const months = {
  id: ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
}
const years = ['2026', '2025']
// S5 left USD 100 in 1103 Bank USD at 15,500 (1,550,000); revaluation books the difference.
const usdBalance = 100
const bookRate = 15_500
const cardCls = 'glass-card'
const jrGrid = 'grid grid-cols-[100px_minmax(0,1.4fr)_minmax(0,1.4fr)_100px_100px] gap-2'

const parseRate = (s: string) => Number(s.replace(/,/g, ''))

export function MonthEnd() {
  const t = useT()
  const { lang, showToast } = useShell()
  const [tab, setTab] = useState('new')
  const [early, setEarly] = useState(false)
  const [problems, setProblems] = useState<string[]>([])
  const runs = useQuery(monthEndRunsQuery)
  const run = useRunMonthEnd()
  const { control, register, handleSubmit } = useForm<MonthEndInput>({
    resolver: zodResolver(monthEndSchema),
    defaultValues: { month: 10, year: 2026, usdRate: '' },
  })
  const [month, year, rate] = useWatch({ control, name: ['month', 'year', 'usdRate'] })
  const r = parseRate(rate)
  const diff = r > 0 ? Math.round(usdBalance * (r - bookRate)) : 0
  const period = `${months[lang][month - 1]} ${year}`
  const periodId = `${months.id[month - 1]} ${year}`

  const doRun = () =>
    run.mutate(
      { name: `Proses Akhir Bulan ${periodId}`, date: '17/10/2026', note: `JV.2026.10.00024 · Revaluasi kurs US Dollar ${fmt(r)}` },
      {
        onSuccess: () => {
          setEarly(false)
          showToast(t({ id: `Proses akhir bulan ${period} tersimpan · JV.2026.10.00024`, en: `Month-end for ${period} saved · JV.2026.10.00024` }))
          setTab('list')
        },
      },
    )
  const save = handleSubmit(
    (v) => {
      if (Number.isNaN(r) || r <= 0) return setProblems([t({ id: 'Nilai tukar US Dollar tidak valid', en: 'US Dollar rate is invalid' })])
      // Today is 17/10/2026, so October 2026 (or later) has not ended yet.
      if (v.year * 12 + v.month >= 2026 * 12 + 10 && !early) return setEarly(true)
      doRun()
    },
    (e) => setProblems(e.usdRate ? [t({ id: 'Nilai tukar US Dollar harus diisi', en: 'US Dollar exchange rate is required' })] : []),
  )
  const jr =
    diff >= 0
      ? [
          { c: '1103', n: 'Bank USD', d: diff, cr: 0 },
          { c: '720102', n: 'Laba Selisih Kurs Terealisasi', d: 0, cr: diff },
        ]
      : [
          { c: '720102', n: 'Laba Selisih Kurs Terealisasi', d: -diff, cr: 0 },
          { c: '1103', n: 'Bank USD', d: 0, cr: -diff },
        ]

  return (
    <Frame>
      <div data-screen-label="Proses Akhir Bulan" className="flex flex-col gap-3.5">
        <Seg
          items={[
            { id: 'new', n: t({ id: 'Proses Baru', en: 'New Run' }) },
            { id: 'list', n: t({ id: 'Riwayat', en: 'History' }) },
          ]}
          value={tab}
          onChange={setTab}
        />
        {tab === 'new' ? (
          <form onSubmit={save} className={cn(cardCls, 'flex flex-wrap items-start gap-[22px] p-[22px]')}>
            <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-4">
              <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3.5">
                <label className="flex flex-col gap-1.5 text-[11px]">
                  <span className="opacity-80">
                    {t({ id: 'Bulan', en: 'Month' })} <span className="text-[#ec4899]">*</span>
                  </span>
                  <Controller
                    control={control}
                    name="month"
                    render={({ field }) => (
                      <Dropdown
                        noClear
                        value={months[lang][field.value - 1]}
                        options={months[lang]}
                        onSelect={(v) => {
                          field.onChange(months[lang].indexOf(v) + 1)
                          setEarly(false)
                        }}
                      />
                    )}
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-[11px]">
                  <span className="opacity-80">{t({ id: 'Tahun', en: 'Year' })}</span>
                  <Controller
                    control={control}
                    name="year"
                    render={({ field }) => (
                      <Dropdown
                        noClear
                        value={String(field.value)}
                        options={years}
                        onSelect={(v) => {
                          field.onChange(Number(v))
                          setEarly(false)
                        }}
                      />
                    )}
                  />
                </label>
              </div>
              <div className="max-w-[520px] overflow-hidden rounded-2xl border border-[rgba(var(--fg),.14)]">
                <div className="grid grid-cols-[1fr_160px] gap-2.5 border-b border-[rgba(var(--fg),.1)] px-3.5 py-2.5 text-[11px] opacity-80">
                  <span>{t({ id: 'Nama Mata Uang', en: 'Currency' })}</span>
                  <span className="text-right">{t({ id: 'Nilai Tukar', en: 'Exchange Rate' })}</span>
                </div>
                <div className="grid grid-cols-[1fr_160px] gap-2.5 border-b border-[rgba(var(--fg),.07)] px-3.5 py-2.5 text-[13px]">
                  <span>Indonesian Rupiah</span>
                  <span className="text-right whitespace-nowrap tabular-nums">1</span>
                </div>
                <div className="grid grid-cols-[1fr_160px] items-center gap-2.5 px-3.5 py-2 text-[13px]">
                  <span>US Dollar</span>
                  <input
                    {...register('usdRate')}
                    inputMode="decimal"
                    aria-label={t({ id: 'Nilai Tukar US Dollar', en: 'US Dollar exchange rate' })}
                    className="box-border w-full rounded-[10px] border border-[rgba(var(--fg),.18)] bg-[rgba(var(--fg),.06)] px-2.5 py-[7px] text-right text-[13px] text-(--ink) tabular-nums outline-none"
                  />
                </div>
              </div>
              {early && (
                <div role="alertdialog" aria-label={t({ id: 'Konfirmasi', en: 'Confirm' })} className="flex max-w-[520px] flex-col gap-2.5 rounded-2xl border border-[#f59e0b] bg-[rgba(245,158,11,.1)] px-4 py-3.5 text-[13px]">
                  <span className="flex items-start gap-2">
                    <i className="ph-light ph-warning text-[18px] text-[#f59e0b]" />
                    {t({
                      id: `Periode ${period} belum berakhir. Transaksi setelah proses ini tidak akan ikut direvaluasi. Tetap proses lebih awal?`,
                      en: `${period} has not ended yet. Entries posted after this run will not be revalued. Close early anyway?`,
                    })}
                  </span>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setEarly(false)} className={btnOutline}>
                      {t({ id: 'Batal', en: 'Cancel' })}
                    </button>
                    <button type="button" autoFocus onClick={doRun} disabled={run.isPending} className={btnInk}>
                      {t({ id: 'Lanjutkan', en: 'Continue' })}
                    </button>
                  </div>
                </div>
              )}
              {diff !== 0 && (
                <div className="flex max-w-[640px] flex-col gap-2 rounded-2xl border border-[rgba(var(--fg),.14)] px-4 py-3.5">
                  <span className="flex items-center gap-1.5 text-[13px]">
                    <i className="ph-light ph-gear-six" />
                    JV.2026.10.00024 · {t({ id: 'Revaluasi Selisih Kurs', en: 'Exchange Revaluation' })}
                  </span>
                  <div className={cn(jrGrid, 'text-[11px] opacity-80')}>
                    <span>{t({ id: 'Akun', en: 'Account' })}</span>
                    <span>{t({ id: 'Nama', en: 'Name' })}</span>
                    <span>Memo</span>
                    <span className="text-right">Debit</span>
                    <span className="text-right">{t({ id: 'Kredit', en: 'Credit' })}</span>
                  </div>
                  {jr.map((j) => (
                    <div key={j.c} className={cn(jrGrid, 'text-[12.5px]')}>
                      <span>{j.c}</span>
                      <span>{j.n}</span>
                      <span className="opacity-85">USD {fmt(usdBalance)} @ {fmt(r)}</span>
                      <span className="text-right whitespace-nowrap tabular-nums">{fmt(j.d)}</span>
                      <span className="text-right whitespace-nowrap tabular-nums">{fmt(j.cr)}</span>
                    </div>
                  ))}
                  <span className="text-[11px] opacity-75">{t({ id: 'Jurnal dibuat otomatis oleh Proses Akhir Bulan', en: 'Journal generated automatically by Month-End Closing' })}</span>
                </div>
              )}
            </div>
            <div className="ml-auto flex-none">
              <button type="submit" title={t({ id: 'Simpan [Ctrl + S]', en: 'Save [Ctrl + S]' })} disabled={run.isPending} className={cn(btnInk, 'rounded-[20px] px-5 py-2.5 text-[13px]')}>
                <i className="ph-light ph-floppy-disk" />
                {t({ id: 'Simpan', en: 'Save' })}
              </button>
            </div>
          </form>
        ) : (
          <div className={cn(cardCls, 'overflow-hidden')}>
            <div className="grid grid-cols-[1fr_.8fr_2fr] gap-3 border-b border-[rgba(var(--fg),.12)] px-[22px] py-[13px] text-[11px] opacity-80">
              <span>{t({ id: 'Nama', en: 'Name' })}</span>
              <span>{t({ id: 'Tanggal', en: 'Date' })}</span>
              <span>{t({ id: 'Catatan', en: 'Note' })}</span>
            </div>
            {runs.data?.map((x) => (
              <div key={x.name + x.date} className="grid grid-cols-[1fr_.8fr_2fr] gap-3 border-b border-[rgba(var(--fg),.07)] px-[22px] py-3 text-[13px]">
                <span>{x.name}</span>
                <span className="tabular-nums">{x.date}</span>
                <span>{x.note}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <Confirm
        open={problems.length > 0}
        onOpenChange={(o) => !o && setProblems([])}
        icon={<i className="ph-light ph-warning-circle text-[22px] text-[#ef4444]" />}
        title={t({ id: 'Terjadi Permasalahan pada Pemrosesan', en: 'There was a problem processing' })}
        actions={
          <>
            <button
              type="button"
              className={btnOutline}
              onClick={() => {
                void navigator.clipboard?.writeText(problems.join('\n'))
                showToast(t({ id: 'Disalin', en: 'Copied' }))
              }}
            >
              <i className="ph-light ph-copy" /> {t({ id: 'Salin', en: 'Copy' })}
            </button>
            <ConfirmAction className={btnInk}>OK</ConfirmAction>
          </>
        }
      >
        <div className="text-[13px] opacity-85">{t({ id: 'Silakan perbaiki permasalahan berikut ini:', en: 'Please fix the following:' })}</div>
        <ul className="mt-3.5 flex list-disc flex-col gap-1.5 pl-5 text-[13px]">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </Confirm>
    </Frame>
  )
}
