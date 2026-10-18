import { paymentDocSchema, type PaymentDocInput } from '@northline/schemas/docs'
import { accounts, idr } from '@northline/schemas/fixtures'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form'
import { nextNumber, openInvoices, partiesFor, payTotals, pphOf, useSaveDoc, vendors } from '@/api/docs'
import { Dropdown } from '@/components/dropdown'
import { useShell, useT } from '@/lib/shell'
import { cn } from '@/lib/utils'
import { DatePicker } from '@/features/fixed-assets/parts'
import { Check, NumCell } from './item-form'
import { AutoSwitch } from './journal-form'
import { FormFrame, Rail, Totals, lbl, req, required, type FormProps } from './shell'

const banks = accounts.filter((a) => a.parent === '1100').map((a) => `${a.code} ${a.name}`)
const cols = 'grid-cols-[1.4fr_.9fr_1fr_1fr_1.2fr_1fr_.9fr]'

export function PaymentForm({ type, docLabel, record, values, dirty, onEdit, onSaved, onDelete, report, onClose, partyLabel }: FormProps<PaymentDocInput> & { partyLabel: string }) {
  const { L, isMobile, showToast } = useShell()
  const t = useT()
  const save = useSaveDoc()
  const { register, control, handleSubmit, subscribe } = useForm<PaymentDocInput>({ resolver: zodResolver(paymentDocSchema), defaultValues: values })
  const { fields, replace } = useFieldArray({ control, name: 'lines' })
  const v = useWatch({ control }) as PaymentDocInput
  const tot = payTotals(v.lines)
  const pphAllowed = type === 'purchase-payment' && !!vendors.find((x) => x.name === v.party)?.pph23

  useEffect(() => subscribe({ formState: { values: true }, callback: ({ values }) => onEdit(values) }), [subscribe, onEdit])

  const submit = handleSubmit(
    (x) => {
      const lines = x.lines.filter((l) => l.pay > 0)
      if (!lines.length) return report([`${t({ id: 'Bayar', en: 'Payment' })} harus diisi`])
      if (x.amount < payTotals(lines).net) return report(['Nilai Pembayaran tidak mencukupi untuk melunasi pembayaran!'])
      const no = record ? record.no : x.autoNo ? nextNumber(`${x.bank.split(' ')[0]}.2026.10.`) : x.number
      save.mutate(
        { id: record?.id, type, source: record?.source ?? docLabel, no, date: x.date, party: x.party, description: x.description, total: x.amount, values: { ...x, lines, number: no } },
        {
          onSuccess: () => {
            showToast(`${docLabel} "${no}" berhasil disimpan`)
            onSaved()
          },
        },
      )
    },
    (e) => report(required(e, { party: partyLabel, bank: 'Bank', date: L.date, amount: 'Nilai Pembayaran', lines: t({ id: 'Rincian Faktur', en: 'Invoices' }) })),
  )

  return (
    <FormFrame rail={<Rail dirty={dirty} saving={save.isPending} onSave={submit} onDelete={() => onDelete(record?.no ?? values.number)} onClose={onClose} />}>
      <form onSubmit={submit}>
        <div className={cn('grid items-start gap-3.5', isMobile ? 'grid-cols-1' : 'grid-cols-[repeat(auto-fill,minmax(220px,1fr))]')}>
          <label className={lbl}>
            <span className="opacity-75">
              {partyLabel} {req}
            </span>
            <Controller
              control={control}
              name="party"
              render={({ field }) => (
                <Dropdown
                  value={field.value}
                  disabled={!!record}
                  options={partiesFor(type)}
                  onSelect={(p) => {
                    field.onChange(p)
                    replace(p ? openInvoices(type, p, record?.id) : [])
                  }}
                  className="h-[41px]"
                />
              )}
            />
          </label>
          <label className={lbl}>
            <span className="opacity-75">Bank {req}</span>
            <Controller control={control} name="bank" render={({ field }) => <Dropdown noClear value={field.value} options={banks} onSelect={field.onChange} className="h-[41px]" />} />
          </label>
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
          <label className={lbl}>
            <span className="opacity-75">Nilai Pembayaran {req}</span>
            <Controller control={control} name="amount" render={({ field }) => <NumCell value={field.value} onChange={field.onChange} label="Nilai Pembayaran" className="h-[41px] rounded-[14px]" />} />
          </label>
        </div>

        <div className="mt-[22px] text-[15px]">
          {t({ id: 'Rincian Faktur', en: 'Invoices' })} {req}
        </div>
        <div className="mt-2.5 overflow-x-auto rounded-2xl border border-[rgba(var(--fg),.12)]">
          <div className="min-w-[760px]">
            <div className={cn('grid gap-2 border-b border-[rgba(var(--fg),.1)] px-4 py-[11px] text-[11px] opacity-55', cols)}>
              <span>{t({ id: 'No. Faktur', en: 'Invoice' })}</span>
              <span>{L.date}</span>
              <span className="text-right">{L.total}</span>
              <span className="text-right">{t({ id: 'Terutang', en: 'Owing' })}</span>
              <span className="text-right">{t({ id: 'Bayar', en: 'Pay' })}</span>
              <span className="text-right">{L.discount}</span>
              <span className="text-right">PPh 23</span>
            </div>
            <div className="max-h-[260px] overflow-auto">
              {fields.map((f, i) => {
                const l = v.lines[i] ?? f
                return (
                  <div key={f.id} data-rf-row className={cn('grid animate-[fade_.2s] items-center gap-2 border-b border-[rgba(var(--fg),.07)] px-4 py-2 text-[13px]', cols)}>
                    <span className="tabular-nums">{l.invoice}</span>
                    <span className="opacity-75">{l.date}</span>
                    <span className="text-right tabular-nums">{idr(l.total)}</span>
                    <span className="text-right tabular-nums">{idr(l.owing)}</span>
                    <Controller control={control} name={`lines.${i}.pay`} render={({ field }) => <NumCell value={field.value} onChange={field.onChange} label={t({ id: 'Bayar', en: 'Pay' })} />} />
                    <Controller control={control} name={`lines.${i}.discount`} render={({ field }) => <NumCell value={field.value} onChange={field.onChange} label={L.discount} />} />
                    <span className="flex items-center justify-end gap-2">
                      {pphAllowed && <Controller control={control} name={`lines.${i}.pph`} render={({ field }) => <Check checked={field.value} onChange={field.onChange} label="PPh" />} />}
                      <span className="tabular-nums">{idr(pphOf(l))}</span>
                    </span>
                  </div>
                )
              })}
              {fields.length === 0 && (
                <div className="p-[22px] text-center text-[13px] opacity-50">
                  {v.party ? t({ id: 'Tidak ada faktur terutang', en: 'No open invoices' }) : t({ id: `Pilih ${partyLabel.toLowerCase()} terlebih dahulu`, en: `Choose a ${partyLabel.toLowerCase()} first` })}
                </div>
              )}
            </div>
          </div>
        </div>
        {pphAllowed && <div className="mt-2 text-[11.5px] opacity-75">{t({ id: 'Dipotong PPh 23 4% dari DPP (pemasok tanpa NPWP)', en: 'PPh 23 withheld at 4% of DPP (vendor without NPWP)' })}</div>}

        <div className="mt-3.5">
          <Totals
            rows={[
              { l: t({ id: 'Total Bayar', en: 'Total Paid' }), v: idr(tot.pay) },
              { l: L.discount, v: tot.discount ? `(${idr(tot.discount)})` : '0' },
              { l: 'PPh 23', v: tot.pph ? `(${idr(tot.pph)})` : '0' },
              { l: t({ id: 'Pembayaran', en: 'Payment' }), v: idr(tot.net), big: true },
            ]}
          />
        </div>
      </form>
    </FormFrame>
  )
}
