import { zodResolver } from '@hookform/resolvers/zod'
import { reportParamsSchema, type Report, type ReportParams } from '@northline/schemas/reports'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useShell, useT } from '@/lib/shell'
import { cn } from '@/lib/utils'
import { colDefs, type ColId } from './model'
import { Check, modal, xBtn } from './ui'

const tx = {
  general: { id: 'Umum', en: 'General' },
  columns: { id: 'Kolom', en: 'Columns' },
  asOf: { id: 'Per tanggal', en: 'As of' },
  from: { id: 'Dari tanggal', en: 'From' },
  to: { id: 'Sampai tanggal', en: 'To' },
  branch: { id: 'Cabang', en: 'Branch' },
  cur: { id: 'Mata uang', en: 'Currency' },
  pick: { id: 'Pilih satu atau lebih', en: 'Pick one or more' },
  req: { id: 'Wajib diisi', en: 'Required' },
}
const picks = { branch: ['Pusat', 'Cabang Surabaya', 'Cabang Medan'], cur: ['IDR', 'USD', 'SGD'] }
const opts = [
  { v: 'code', t: { id: 'Tampilkan kode akun', en: 'Show account codes' } },
  { v: 'total', t: { id: 'Tampilkan baris total', en: 'Show total rows' } },
  { v: 'zero', t: { id: 'Sertakan akun bersaldo nol', en: 'Include zero-balance accounts' } },
  { v: 'ind', t: { id: 'Indentasi akun anak', en: 'Indent child accounts' } },
]
const colOpts: ColId[] = ['prev', 'diff', 'pct']
const defaults: ReportParams = { from: '2026-01-01', to: '2026-10-17', branch: ['Pusat'], cur: ['IDR'], opts: ['total', 'ind'], cols: [] }

export function ParamsDialog({ report, onClose }: { report: Report | null; onClose: () => void }) {
  const { L, isMobile } = useShell()
  const t = useT()
  const nav = useNavigate()
  const [tab, setTab] = useState<'g' | 'c'>('g')
  const { control, register, handleSubmit, formState } = useForm<ReportParams>({ resolver: zodResolver(reportParamsSchema), defaultValues: defaults })

  const go = handleSubmit((p) => {
    if (!report) return
    nav({
      to: '/reports/$reportId',
      params: { reportId: report.id },
      search: { from: report.dates === 'range' ? p.from : undefined, to: p.to, branch: p.branch.join(','), cur: p.cur.join(','), opts: p.opts.join(','), cols: p.cols.join(',') },
    })
  })

  const dateF: { name: 'from' | 'to'; label: string }[] = report?.dates === 'range' ? [{ name: 'from', label: t(tx.from) }, { name: 'to', label: t(tx.to) }] : [{ name: 'to', label: t(tx.asOf) }]
  const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])

  return (
    <Dialog open={!!report} onOpenChange={(o) => !o && onClose()}>
      <DialogContent showCloseButton={false} className={cn(modal, 'flex max-h-[calc(100%-32px)] w-[min(560px,calc(100%-32px))] flex-col gap-0 overflow-y-auto', isMobile ? 'p-[22px]' : 'p-7')} data-screen-label="Report parameters">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[.5px] opacity-60">{L.rpParams}</div>
            <DialogTitle className="mt-1.5 text-[22px] font-light leading-[1.2]">{report && t(report.name)}</DialogTitle>
          </div>
          <button type="button" aria-label={L.close} className={xBtn} onClick={onClose}>
            ×
          </button>
        </div>
        <div className="mt-[18px] flex gap-1 self-start rounded-[20px] bg-[rgba(var(--fg),.08)] p-1">
          {(['g', 'c'] as const).map((k) => (
            <button key={k} type="button" onClick={() => setTab(k)} className={cn('cursor-pointer rounded-[16px] px-4 py-2 text-[12px]', tab === k && 'bg-(--ink) text-(--paper)')}>
              {t(k === 'g' ? tx.general : tx.columns)}
            </button>
          ))}
        </div>
        {tab === 'g' && (
          <>
            <div className="mt-[22px] text-[10.5px] uppercase tracking-[.5px] opacity-55">{L.rpDate}</div>
            <div className="mt-2.5 grid gap-3" style={{ gridTemplateColumns: isMobile ? '1fr' : `repeat(${dateF.length},minmax(0,1fr))` }}>
              {dateF.map((f) => (
                <label key={f.name} className="flex flex-col gap-1.5 text-[11px]">
                  {f.label}
                  <input type="date" {...register(f.name)} className="h-[42px] rounded-[14px] border border-[rgba(var(--fg),.18)] bg-[rgba(var(--fg),.06)] px-3.5 py-[11px] text-[13px] text-(--ink) outline-none [color-scheme:dark] in-data-[mode=light]:[color-scheme:light]" />
                </label>
              ))}
            </div>
            <div className="mt-[22px] text-[10.5px] uppercase tracking-[.5px] opacity-55">{L.rpMore}</div>
            <div className="mt-2.5 flex flex-col gap-3">
              {(['branch', 'cur'] as const).map((name) => (
                <Controller
                  key={name}
                  control={control}
                  name={name}
                  render={({ field }) => (
                    <ChipPick label={t(tx[name])} ph={t(tx.pick)} err={formState.errors[name] ? t(tx.req) : ''} options={picks[name]} value={field.value} onChange={field.onChange} />
                  )}
                />
              ))}
            </div>
            <Controller
              control={control}
              name="opts"
              render={({ field }) => (
                <div className="mt-3 flex flex-col">
                  {opts.map((o) => (
                    <Check key={o.v} on={field.value.includes(o.v)} onChange={() => field.onChange(toggle(field.value, o.v))} className="px-0.5 py-2">
                      <span className="opacity-90">{t(o.t)}</span>
                    </Check>
                  ))}
                </div>
              )}
            />
          </>
        )}
        {tab === 'c' && (
          <>
            <div className="mt-5 text-[12.5px] leading-[1.45] opacity-65">{L.rpColsHint}</div>
            <Controller
              control={control}
              name="cols"
              render={({ field }) => (
                <div className="mt-3 overflow-hidden rounded-[16px] border border-[rgba(var(--fg),.12)]">
                  <div className="flex items-center gap-3 border-b border-[rgba(var(--fg),.08)] px-3.5 py-3 text-[13px]">
                    <Check on disabled className="py-0 opacity-40" />
                    <span className="flex-1">{L.rpDesc}</span>
                    <span className="text-[11px] opacity-50">{L.rpLocked}</span>
                  </div>
                  {colOpts.map((c) => (
                    <Check key={c} on={field.value.includes(c)} onChange={() => field.onChange(toggle(field.value, c))} className="w-full gap-3 border-b border-[rgba(var(--fg),.08)] px-3.5 py-3 last:border-b-0 hover:bg-[rgba(var(--fg),.06)]">
                      <span className="min-w-0 flex-1">{t(colDefs[c])}</span>
                    </Check>
                  ))}
                </div>
              )}
            />
          </>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="cursor-pointer rounded-[20px] bg-[rgba(var(--fg),.1)] px-[18px] py-3 text-[13px]" onClick={onClose}>
            {L.cancel}
          </button>
          <button type="button" className="cursor-pointer rounded-[20px] bg-(--ink) px-5 py-3 text-[13px] text-(--paper)" onClick={go}>
            {L.repShow}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ChipPick({ label, ph, err, options, value, onChange }: { label: string; ph: string; err: string; options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex flex-col gap-1.5 text-[11px]">
      <span>
        {label} <span className="text-[#ec4899]">*</span>
      </span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div
            role="button"
            tabIndex={0}
            className={cn('flex min-h-11 cursor-pointer flex-wrap items-center gap-1.5 rounded-[14px] border bg-[rgba(var(--fg),.06)] px-2 py-1.5 transition-[border-color] duration-150', err ? 'border-[#f472b6]' : open ? 'border-[rgba(var(--fg),.45)]' : 'border-[rgba(var(--fg),.18)]')}
          >
            {value.map((v) => (
              <span key={v} className="flex items-center gap-1.5 rounded-[10px] bg-[rgba(var(--fg),.14)] py-[5px] pr-1.5 pl-2.5 text-[12px]">
                {v}
                <span
                  role="button"
                  aria-label={`× ${v}`}
                  className="flex size-[18px] items-center justify-center rounded-full text-[13px] leading-none opacity-70 hover:bg-[rgba(var(--fg),.2)] hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    onChange(value.filter((x) => x !== v))
                  }}
                >
                  ×
                </span>
              </span>
            ))}
            {!value.length && <span className="px-1.5 text-[12.5px] opacity-50">{ph}</span>}
            <i className="ph-light ph-magnifying-glass ml-auto px-1.5 text-[15px] opacity-60" />
          </div>
        </PopoverTrigger>
        <PopoverContent align="start" className="glass-pop font-light w-(--radix-popover-trigger-width) rounded-[16px] p-1.5 text-(--ink)">
          {options.map((o) => (
            <div
              key={o}
              role="option"
              aria-selected={value.includes(o)}
              onClick={() => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o])}
              className={cn('flex cursor-pointer items-center justify-between gap-2.5 rounded-[10px] px-2.5 py-[9px] text-[12.5px] hover:bg-[rgba(var(--fg),.12)]', value.includes(o) && 'bg-[rgba(var(--fg),.08)]')}
            >
              {o}
              <i className={cn('text-[14px]', value.includes(o) ? 'ph-light ph-check' : '')} />
            </div>
          ))}
        </PopoverContent>
      </Popover>
      {err && <span className="text-[#f472b6]">{err}</span>}
    </div>
  )
}
