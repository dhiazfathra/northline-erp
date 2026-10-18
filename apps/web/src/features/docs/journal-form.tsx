import { journalDocSchema, type JournalDocInput } from '@northline/schemas/docs'
import { accounts, idr, leafAccounts } from '@northline/schemas/fixtures'
import { zodResolver } from '@hookform/resolvers/zod'
import { Dialog, RadioGroup, Switch } from 'radix-ui'
import { useEffect, useState } from 'react'
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form'
import { docMeta, nextNumber, useSaveDoc } from '@/api/docs'
import { Dropdown } from '@/components/dropdown'
import { Seg, overlayCls, panelCls } from '@/features/ledger/ui'
import { useShell, useT } from '@/lib/shell'
import { cn } from '@/lib/utils'
import { DatePicker } from '@/features/fixed-assets/parts'
import { FormFrame, Rail, Totals, fieldCls, lbl, req, required, toNum, type FormProps } from './shell'

type Line = JournalDocInput['lines'][number]
const accName = (code: string) => accounts.find((a) => a.code === code)?.name ?? ''
const options = leafAccounts.map((a) => `${a.code} ${a.name}`)
const cols = 'grid-cols-[110px_minmax(0,1.6fr)_minmax(0,1.4fr)_1fr_1fr_28px]'

export function JournalForm({ type, docLabel, record, values, dirty, onEdit, onSaved, onDelete, report, onClose }: FormProps<JournalDocInput>) {
  const { L, isMobile, showToast } = useShell()
  const t = useT()
  const save = useSaveDoc()
  const { register, control, handleSubmit, subscribe } = useForm<JournalDocInput>({ resolver: zodResolver(journalDocSchema), defaultValues: values })
  const { fields, append, update, remove } = useFieldArray({ control, name: 'lines' })
  const lines = useWatch({ control, name: 'lines' })
  const [edit, setEdit] = useState<{ i: number; line: Line } | null>(null)
  const debit = lines.reduce((s, l) => s + l.debit, 0)
  const credit = lines.reduce((s, l) => s + l.credit, 0)
  const diff = debit - credit

  useEffect(() => subscribe({ formState: { values: true }, callback: ({ values }) => onEdit(values) }), [subscribe, onEdit])

  const submit = handleSubmit(
    (v) => {
      if (record && type === 'journal' && record.source !== 'Jurnal Umum') return report([`Jurnal ${record.jv} dibuat oleh ${record.source} ${record.no}; ubah dari dokumen sumbernya`])
      if (diff !== 0) return report(['Jurnal yang anda masukkan tidak seimbang antara debit dengan kredit'])
      const no = record ? record.no : v.autoNo ? nextNumber(docMeta[type].prefix) : v.number
      save.mutate(
        { id: record?.id, type, source: record?.source ?? docLabel, no, date: v.date, party: '', description: v.description, total: debit, values: { ...v, number: no } },
        {
          onSuccess: () => {
            showToast(`${docLabel} "${no}" berhasil disimpan`)
            onSaved()
          },
        },
      )
    },
    (e) => report(required(e, { date: 'Tanggal', number: 'No. Transaksi', lines: 'Rincian Akun' })),
  )

  return (
    <FormFrame rail={<Rail dirty={dirty} saving={save.isPending} onSave={submit} onDelete={() => onDelete(record?.no ?? values.number)} onClose={onClose} />}>
      <form onSubmit={submit}>
        <div className={cn('grid items-start gap-3.5', isMobile ? 'grid-cols-1' : 'grid-cols-[repeat(auto-fill,minmax(220px,1fr))]')}>
          <label className={lbl}>
            <span className="opacity-75">
              {L.date} {req}
            </span>
            <Controller control={control} name="date" render={({ field }) => <DatePicker dmy value={field.value} onChange={field.onChange} />} />
          </label>
          <Controller
            control={control}
            name="autoNo"
            render={({ field }) => (
              <label className={lbl}>
                <span className="opacity-75">{L.docNo}</span>
                <span className="field flex h-[41px] items-center gap-2 pr-3 pl-3.5">
                  <input {...register('number')} readOnly={field.value || !!record} className="min-w-0 flex-1 bg-transparent text-[13px] text-(--ink) tabular-nums outline-none read-only:opacity-70" />
                  {!record && <AutoSwitch checked={field.value} onChange={field.onChange} label={L.auto} />}
                </span>
              </label>
            )}
          />
          <label className={cn(lbl, !isMobile && 'col-span-2')}>
            <span className="opacity-75">{L.notes}</span>
            <input {...register('description')} className={fieldCls} />
          </label>
        </div>

        <div className="mt-[22px] flex flex-wrap items-center justify-between gap-2.5">
          <span className="text-[15px]">
            {t({ id: 'Rincian Akun', en: 'Account Lines' })} {req}
          </span>
          <div className="w-[280px] max-w-full">
            <Dropdown
              value=""
              options={options}
              placeholder={t({ id: 'Cari/Pilih Akun Perkiraan…', en: 'Search account…' })}
              onSelect={(o) => o && setEdit({ i: -1, line: { account: o.split(' ')[0], debit: 0, credit: 0, memo: '' } })}
            />
          </div>
        </div>
        <div className="mt-2.5 overflow-hidden rounded-2xl border border-[rgba(var(--fg),.12)]">
          {!isMobile && (
            <div className={cn('grid border-b border-[rgba(var(--fg),.1)] px-4 py-[11px] text-[11px] opacity-55', cols)}>
              <span>{L.code}</span>
              <span>{L.name}</span>
              <span>Memo</span>
              <span className="text-right">Debit</span>
              <span className="text-right">{t({ id: 'Kredit', en: 'Credit' })}</span>
              <span />
            </div>
          )}
          <div className="max-h-[260px] overflow-auto">
            {fields.map((f, i) => {
              const l = lines[i] ?? f
              const del = (
                <button
                  type="button"
                  aria-label={t({ id: 'Hapus baris', en: 'Remove line' })}
                  onClick={(e) => {
                    e.stopPropagation()
                    remove(i)
                  }}
                  className="cursor-pointer opacity-60 hover:opacity-100"
                >
                  ×
                </button>
              )
              return (
                <div
                  key={f.id} data-rf-row
                  role="button"
                  tabIndex={0}
                  onClick={() => setEdit({ i, line: l })}
                  onKeyDown={(e) => e.key === 'Enter' && setEdit({ i, line: l })}
                  className={cn(
                    'cursor-pointer animate-[fade_.2s] border-b border-[rgba(var(--fg),.07)] text-[13px] hover:bg-[rgba(var(--fg),.06)]',
                    isMobile ? 'flex items-center gap-2.5 px-3.5 py-3' : cn('grid items-center px-4 py-[11px]', cols),
                  )}
                >
                  {isMobile ? (
                    <>
                      <div className="min-w-0 flex-1">
                        <div className="truncate">
                          {l.account} {accName(l.account)}
                        </div>
                        <div className="mt-[3px] text-[11px] opacity-60">{l.debit ? 'Debit' : t({ id: 'Kredit', en: 'Credit' })}</div>
                      </div>
                      <span className="tabular-nums">{idr(l.debit || l.credit)}</span>
                      {del}
                    </>
                  ) : (
                    <>
                      <span className="tabular-nums">{l.account}</span>
                      <span className="truncate">{accName(l.account)}</span>
                      <span className="truncate opacity-65">{l.memo}</span>
                      <span className="text-right tabular-nums">{l.debit ? idr(l.debit) : ''}</span>
                      <span className="text-right tabular-nums">{l.credit ? idr(l.credit) : ''}</span>
                      <span className="text-right">{del}</span>
                    </>
                  )}
                </div>
              )
            })}
            {fields.length === 0 && <div className="p-[22px] text-center text-[13px] opacity-50">{L.noData}</div>}
          </div>
        </div>
        <div className="mt-3.5 flex flex-wrap items-end justify-between gap-4">
          {diff !== 0 ? (
            <span className="flex items-center gap-1.5 rounded-xl border border-[#f472b6] px-3 py-1.5 text-xs text-[#f472b6]">
              <i className="ph-light ph-scales" />
              {t({ id: 'Selisih', en: 'Difference' })} {idr(Math.abs(diff))}
            </span>
          ) : (
            <span />
          )}
          <Totals
            rows={[
              { l: 'Total Debit', v: idr(debit) },
              { l: t({ id: 'Total Kredit', en: 'Total Credit' }), v: idr(credit) },
            ]}
          />
        </div>
      </form>
      <LineDialog
        edit={edit}
        onClose={() => setEdit(null)}
        onDone={(line) => {
          if (edit && edit.i >= 0) update(edit.i, line)
          else append(line)
          setEdit(null)
        }}
      />
    </FormFrame>
  )
}

export function AutoSwitch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <span className="flex flex-none items-center" title={label}>
      <Switch.Root checked={checked} onCheckedChange={onChange} aria-label={label} className="relative h-4 w-7 cursor-pointer rounded-lg bg-[rgba(var(--fg),.25)] data-[state=checked]:bg-(--ink)">
        <Switch.Thumb className="absolute top-0.5 left-0.5 block size-3 rounded-full bg-(--paper) transition-[left] duration-150 data-[state=checked]:left-[14px]" />
      </Switch.Root>
    </span>
  )
}

/** "Detail Akun" line editor: one side per line by construction. */
function LineDialog({ edit, onClose, onDone }: { edit: { i: number; line: Line } | null; onClose: () => void; onDone: (l: Line) => void }) {
  const t = useT()
  return (
    <Dialog.Root open={!!edit} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className={cn(overlayCls, 'z-[89]')} />
        <Dialog.Content aria-describedby={undefined} className={cn(panelCls, 'z-[90] w-[min(480px,calc(100%-32px))] gap-4')}>
          {edit && <LineBody key={edit.i + edit.line.account} line={edit.line} onDone={onDone} />}
          <Dialog.Close aria-label={t({ id: 'Tutup', en: 'Close' })} className="absolute top-6 right-6 size-8 cursor-pointer rounded-full border-none bg-[rgba(var(--fg),.1)] text-base text-(--ink)">
            ×
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function LineBody({ line, onDone }: { line: Line; onDone: (l: Line) => void }) {
  const t = useT()
  const [tab, setTab] = useState('d')
  const [side, setSide] = useState(line.credit ? 'credit' : 'debit')
  const [amt, setAmt] = useState(line.debit || line.credit ? idr(line.debit || line.credit) : '')
  const [memo, setMemo] = useState(line.memo)
  const [err, setErr] = useState(false)
  const go = () => {
    const n = toNum(amt)
    if (!n) {
      setTab('d')
      return setErr(true)
    }
    onDone({ account: line.account, memo, debit: side === 'debit' ? n : 0, credit: side === 'credit' ? n : 0 })
  }
  return (
    <form
      className="contents"
      onSubmit={(e) => {
        e.preventDefault()
        go()
      }}
    >
      <div className="min-w-0 pr-10">
        <div className="text-[11px] tracking-[.5px] uppercase opacity-70">{t({ id: 'Detail Akun', en: 'Account Detail' })}</div>
        <Dialog.Title className="mt-1.5 text-[20px] leading-[1.25] font-light">
          {line.account} · {accName(line.account)}
        </Dialog.Title>
      </div>
      <Seg
        items={[
          { id: 'd', n: t({ id: 'Detail Akun', en: 'Account Detail' }) },
          { id: 'i', n: t({ id: 'Info Lainnya', en: 'Other Info' }) },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'd' ? (
        <div className="flex flex-col gap-2 text-[11px]">
          <span className="opacity-75">
            {t({ id: 'Nilai', en: 'Amount' })} {req}
          </span>
          <RadioGroup.Root value={side} onValueChange={setSide} aria-label={t({ id: 'Sisi', en: 'Side' })} className="flex gap-4">
            {[
              { id: 'debit', n: 'Debit' },
              { id: 'credit', n: t({ id: 'Kredit', en: 'Credit' }) },
            ].map((x) => (
              <label key={x.id} className="flex cursor-pointer items-center gap-2 text-[13px]">
                <RadioGroup.Item value={x.id} className="flex size-4 cursor-pointer items-center justify-center rounded-full border border-(--ink)">
                  <RadioGroup.Indicator className="size-2 rounded-full bg-(--ink)" />
                </RadioGroup.Item>
                {x.n}
              </label>
            ))}
          </RadioGroup.Root>
          <div className="flex items-center gap-2">
            <span className="text-xs opacity-75">Rp</span>
            <input
              autoFocus
              value={amt}
              onChange={(e) => {
                setAmt(e.target.value ? idr(toNum(e.target.value)) : '')
                setErr(false)
              }}
              inputMode="numeric"
              placeholder="0"
              aria-label={t({ id: 'Nilai', en: 'Amount' })}
              aria-invalid={err || undefined}
              aria-describedby="le-amt-err"
              className={cn(
                'box-border min-w-0 flex-1 rounded-[14px] border bg-[rgba(var(--fg),.06)] px-3.5 py-[11px] text-right text-sm text-(--ink) tabular-nums outline-none',
                err ? 'border-[#f472b6]' : 'border-[rgba(var(--fg),.18)]',
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
      ) : (
        <label className="flex flex-col gap-1.5 text-[11px]">
          <span className="opacity-75">Memo</span>
          <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={3} className="field resize-y px-3.5 py-[11px]" />
        </label>
      )}
      <div className="flex justify-end">
        <button type="submit" className="cursor-pointer rounded-[20px] border-none bg-(--ink) px-5 py-2.5 text-[13px] text-(--paper)">
          {t({ id: 'Lanjut', en: 'Continue' })}
        </button>
      </div>
    </form>
  )
}
