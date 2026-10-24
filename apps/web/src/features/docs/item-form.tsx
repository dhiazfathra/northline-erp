import { itemDocSchema, purchaseInvoiceSchema, returnDocSchema, type ItemDocInput } from '@northline/schemas/docs'
import { idr } from '@northline/schemas/fixtures'
import { zodResolver } from '@hookform/resolvers/zod'
import { Checkbox } from 'radix-ui'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form'
import { docMeta, docsQuery, downPaymentsFor, invoicesFor, itemTotals, recordValues, useCatalog, useParties, useSaveDoc } from '@/api/docs'
import { Dropdown } from '@/components/dropdown'
import { btnOutline } from '@/features/ledger/ui'
import { useShell, useT } from '@/lib/shell'
import { cn } from '@/lib/utils'
import { DatePicker } from '@/features/fixed-assets/parts'
import { AutoSwitch } from './journal-form'
import { FormFrame, Head, Info, Rail, noteCls, Totals, cellInput, fieldCls, lbl, req, required, toNum, type FormProps } from './shell'

const cols = 'grid-cols-[2.2fr_1fr_.8fr_.7fr_1.1fr_.7fr_1.1fr_28px]'
const terms = ['COD', 'Net 14', 'Net 30', 'Net 60']

export function NumCell({ value, onChange, label, className }: { value: number; onChange: (n: number) => void; label: string; className?: string }) {
  return <input aria-label={label} inputMode="numeric" value={idr(value)} onChange={(e) => onChange(toNum(e.target.value))} className={cn(cellInput, 'text-right', className)} />
}

export function Check({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[13px]">
      <Checkbox.Root
        checked={checked}
        onCheckedChange={(v) => onChange(v === true)}
        className="flex size-[18px] flex-none cursor-pointer items-center justify-center rounded-[6px] border border-[rgba(var(--fg),.4)] data-[state=checked]:border-(--ink) data-[state=checked]:bg-(--ink)"
      >
        <Checkbox.Indicator>
          <svg width="10" height="8" viewBox="0 0 10 8" aria-hidden="true">
            <path d="M1 4l3 3 5-6" fill="none" strokeWidth="1.6" style={{ stroke: 'var(--paper)' }} />
          </svg>
        </Checkbox.Indicator>
      </Checkbox.Root>
      {label}
    </label>
  )
}

export function ItemForm({ type, docLabel, record, values, dirty, onEdit, onSaved, onDelete, report, onClose, partyLabel }: FormProps<ItemDocInput> & { partyLabel: string }) {
  const { L, isMobile, showToast } = useShell()
  const t = useT()
  const save = useSaveDoc()
  const catalog = useCatalog()
  const parties = useParties(type)
  const isReturn = type === 'sales-return' || type === 'purchase-return'
  const isPurchase = type.startsWith('purchase')
  const hasParty = docMeta[type].party !== null
  const hasInfo = !isReturn && type !== 'stock-adjustment'
  const schema = type === 'purchase-invoice' ? purchaseInvoiceSchema : isReturn ? returnDocSchema : itemDocSchema
  const { register, control, handleSubmit, subscribe, setValue, getValues } = useForm<ItemDocInput>({ resolver: zodResolver(schema), defaultValues: values })
  const { fields, append, remove, replace } = useFieldArray({ control, name: 'items' })
  const v = useWatch({ control }) as ItemDocInput
  // the invoice list a sales invoice takes down payments from, or a return takes its goods from
  const { data: invoices } = useQuery({ ...docsQuery(isPurchase ? 'purchase-invoice' : 'sales-invoice'), enabled: type === 'sales-invoice' || isReturn })
  const dps = type === 'sales-invoice' && v.party ? downPaymentsFor(invoices, v.party).filter((d) => d.no !== record?.no) : []
  const dpTotal = dps.filter((d) => v.dp.includes(d.no)).reduce((s, d) => s + d.total, 0)
  const tot = itemTotals(v, dpTotal)

  useEffect(() => subscribe({ formState: { values: true }, callback: ({ values }) => onEdit(values) }), [subscribe, onEdit])

  const addItem = (o: string) => {
    const c = catalog.find((x) => `${x.code} ${x.name}` === o)
    if (!c) return
    const price = isPurchase || type === 'stock-adjustment' ? c.buyPrice : c.sellPrice
    append({ code: c.code, name: c.name, unit: c.unit, qty: 1, price, discPct: 0 })
  }
  const pull = () => {
    const src = recordValues(invoices, getValues('invoice')) as ItemDocInput | undefined
    if (src) replace(src.items)
  }

  const submit = handleSubmit(
    (x) => {
      save.mutate(
        { id: record?.id, type, values: x },
        {
          onSuccess: ({ number }) => {
            showToast(`${docLabel} "${number}" berhasil disimpan`)
            onSaved()
          },
          onError: (e) => report([e.message]),
        },
      )
    },
    (e) =>
      report(
        required(e, {
          party: partyLabel,
          date: L.date,
          items: L.itemDetail,
          supplierNo: 'No Faktur #',
          invoice: t({ id: 'Faktur', en: 'Invoice' }),
        }),
      ),
  )

  return (
    <FormFrame>
      <form onSubmit={submit}>
        <Head rail={<Rail dirty={dirty} saving={save.isPending} onSave={submit} onDelete={() => onDelete(record?.no ?? values.number)} onClose={onClose} />}>
          {hasParty && (
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
                    options={parties}
                    onSelect={(p) => {
                      field.onChange(p)
                      setValue('dp', [])
                      setValue('invoice', '')
                    }}
                    placeholder={t({ id: `Cari ${partyLabel.toLowerCase()}…`, en: `Search ${partyLabel.toLowerCase()}…` })}
                    className="h-[41px]"
                  />
                )}
              />
            </label>
          )}
          {isReturn && (
            <label className={lbl}>
              <span className="opacity-75">
                {t({ id: 'Faktur', en: 'Invoice' })} {req}
              </span>
              <span className="flex gap-2">
                <Controller
                  control={control}
                  name="invoice"
                  render={({ field }) => (
                    <Dropdown
                      value={field.value}
                      disabled={!v.party}
                      options={v.party ? invoicesFor(invoices, v.party) : []}
                      onSelect={field.onChange}
                      className="h-[41px]"
                    />
                  )}
                />
                <button type="button" disabled={!v.invoice} onClick={pull} className={cn(btnOutline, 'flex-none disabled:opacity-40')}>
                  {t({ id: 'Ambil', en: 'Pull' })}
                </button>
              </span>
            </label>
          )}
          <Controller
            control={control}
            name="autoNo"
            render={({ field }) => (
              <label className={lbl}>
                <span className="opacity-75">{L.docNo}</span>
                <span className="field flex h-[41px] items-center gap-2 pr-3 pl-3.5">
                  <input {...register('number')} placeholder={field.value ? L.auto : undefined} readOnly={field.value || !!record} className="min-w-0 flex-1 bg-transparent text-[13px] text-(--ink) tabular-nums outline-none read-only:opacity-70" />
                  {!record && <AutoSwitch checked={field.value} onChange={field.onChange} label={L.auto} />}
                </span>
              </label>
            )}
          />
          <label className={lbl}>
            <span className="opacity-75">
              {L.date} {req}
            </span>
            <Controller control={control} name="date" render={({ field }) => <DatePicker dmy value={field.value} onChange={field.onChange} />} />
          </label>
          {type === 'purchase-invoice' && (
            <label className={lbl}>
              <span className="opacity-75">No Faktur # {req}</span>
              <input {...register('supplierNo')} className={fieldCls} />
            </label>
          )}
        </Head>

        <Info>
          {hasInfo && (
            <>
              <label className={lbl}>
                <span className="opacity-75">{t({ id: 'Diskon (%)', en: 'Discount (%)' })}</span>
                <Controller control={control} name="discPct" render={({ field }) => <NumCell value={field.value} onChange={(n) => field.onChange(Math.min(n, 100))} label="Diskon" className="h-[41px] rounded-[14px]" />} />
              </label>
              <label className={lbl}>
                <span className="opacity-75">{t({ id: 'Kena Pajak', en: 'Taxable' })}</span>
                <span className="flex h-[41px] items-center">
                  <Controller control={control} name="taxable" render={({ field }) => <Check checked={field.value} onChange={field.onChange} label={t({ id: 'Ya', en: 'Yes' })} />} />
                </span>
              </label>
              <label className={lbl}>
                <span className="opacity-75">{t({ id: 'Total termasuk Pajak', en: 'Tax inclusive' })}</span>
                <span className="flex h-[41px] items-center">
                  <Controller control={control} name="inclusive" render={({ field }) => <Check checked={field.value} onChange={field.onChange} label={t({ id: 'Ya', en: 'Yes' })} />} />
                </span>
              </label>
              <label className={lbl}>
                <span className="opacity-75">{t({ id: 'Syarat Pembayaran', en: 'Payment Terms' })}</span>
                <Controller control={control} name="terms" render={({ field }) => <Dropdown noClear value={field.value} options={terms} onSelect={field.onChange} className="h-[41px]" />} />
              </label>
              <label className={lbl}>
                <span className="opacity-75">No. PO</span>
                <input {...register('poNo')} className={fieldCls} />
              </label>
            </>
          )}
          <label className={cn(lbl, 'col-span-full')}>
            <span className="opacity-75">{L.notes}</span>
            <textarea {...register('description')} rows={3} className={noteCls} />
          </label>
        </Info>

        <div className="mt-[26px] flex flex-wrap items-center justify-between gap-2.5">
          <span className="text-[15px]">
            {L.itemDetail} {req}
          </span>
          <div className="w-[216px] max-w-full">
            <Dropdown value="" options={catalog.map((c) => `${c.code} ${c.name}`)} onSelect={addItem} placeholder={t({ id: 'Cari/Pilih Barang & Jasa...', en: 'Search/select item or service…' })} className="h-9 px-3 text-[12.5px]" />
          </div>
        </div>
        <div className="mt-2.5 overflow-hidden rounded-2xl border border-[rgba(var(--fg),.12)]">
          {!isMobile && (
            <div className={cn('grid gap-2 border-b border-[rgba(var(--fg),.1)] px-4 py-[11px] text-[11px] opacity-55', cols)}>
              <span>{L.itemName}</span>
              <span>{L.code}</span>
              <span>{L.qty}</span>
              <span>{L.unit}</span>
              <span>{L.unitPrice}</span>
              <span>Disc %</span>
              <span className="text-right">{L.total}</span>
              <span />
            </div>
          )}
          <div className="max-h-[260px] overflow-auto">
            {fields.map((f, i) => {
              const it = v.items[i] ?? f
              const line = Math.round(it.qty * it.price * (1 - it.discPct / 100))
              const qty = (
                <Controller control={control} name={`items.${i}.qty`} render={({ field }) => <NumCell value={field.value} onChange={field.onChange} label={L.qty} />} />
              )
              const price = (
                <Controller control={control} name={`items.${i}.price`} render={({ field }) => <NumCell value={field.value} onChange={field.onChange} label={L.unitPrice} />} />
              )
              const disc = (
                <Controller
                  control={control}
                  name={`items.${i}.discPct`}
                  render={({ field }) => <NumCell value={field.value} onChange={(n) => field.onChange(Math.min(n, 100))} label="Disc %" />}
                />
              )
              const del = (
                <button type="button" aria-label={t({ id: 'Hapus barang', en: 'Remove item' })} onClick={() => remove(i)} className="cursor-pointer opacity-60 hover:opacity-100">
                  ×
                </button>
              )
              return isMobile ? (
                <div key={f.id} data-rf-row className="flex animate-[fade_.2s] flex-col gap-2 border-b border-[rgba(var(--fg),.07)] px-3.5 py-3 text-[13px]">
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate">
                      {it.name} <span className="text-[11px] opacity-60">{it.code}</span>
                    </span>
                    <span className="tabular-nums">{idr(line)}</span>
                    {del}
                  </div>
                  <div className="grid grid-cols-[1fr_1.4fr_1fr] gap-2">
                    {qty}
                    {price}
                    {disc}
                  </div>
                </div>
              ) : (
                <div key={f.id} data-rf-row className={cn('grid animate-[fade_.2s] items-center gap-2 border-b border-[rgba(var(--fg),.07)] px-4 py-2 text-[13px]', cols)}>
                  <span className="truncate">{it.name}</span>
                  <span className="opacity-65">{it.code}</span>
                  {qty}
                  <span className="opacity-65">{it.unit}</span>
                  {price}
                  {disc}
                  <span className="text-right tabular-nums">{idr(line)}</span>
                  <span className="text-right">{del}</span>
                </div>
              )
            })}
            {fields.length === 0 && <div className="p-[22px] text-center text-[13px] opacity-50">{L.noData}</div>}
          </div>
        </div>


        {dps.length > 0 && (
          <div className="mt-4 rounded-2xl border border-[rgba(var(--fg),.14)] px-4 py-3">
            <div className="mb-2 text-[13px]">{t({ id: 'Uang Muka', en: 'Down Payment' })}</div>
            <Controller
              control={control}
              name="dp"
              render={({ field }) => (
                <div className="flex flex-col gap-2">
                  {dps.map((d) => {
                    const dv = recordValues(invoices, d.no) as ItemDocInput | undefined
                    const dt = dv && itemTotals(dv)
                    return (
                      <div key={d.no} data-rf-row className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
                        <Check
                          checked={field.value.includes(d.no)}
                          onChange={(on) => field.onChange(on ? [...field.value, d.no] : field.value.filter((x) => x !== d.no))}
                          label={`${d.no} · ${d.date}`}
                        />
                        <span className="tabular-nums opacity-85">
                          {dt ? `${idr(dt.total - dt.tax)} + ${idr(dt.tax)} = ` : ''}
                          {idr(d.total)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            />
          </div>
        )}

        <div className="mt-3.5">
          <Totals
            rows={[
              { l: L.subTotal, v: idr(tot.sub) },
              { l: L.discount, v: tot.disc ? `(${idr(tot.disc)})` : '0' },
              { l: 'PPN 11%', v: idr(tot.tax) },
              ...(tot.dp ? [{ l: t({ id: 'Uang Muka', en: 'Down Payment' }), v: `(${idr(tot.dp)})` }] : []),
              tot.dp ? { l: t({ id: 'Terhutang', en: 'Amount Due' }), v: idr(tot.owing), big: true } : { l: L.total, v: idr(tot.total), big: true },
            ]}
          />
        </div>
      </form>
    </FormFrame>
  )
}
