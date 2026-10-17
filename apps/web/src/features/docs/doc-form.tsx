import { newDocSchema, type DocType, type NewDocInput } from '@northline/schemas/docs'
import { zodResolver } from '@hookform/resolvers/zod'
import { Switch } from 'radix-ui'
import { useEffect } from 'react'
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form'
import { catalog, partiesFor, useCreateDoc } from '@/api/docs'
import { Dropdown } from '@/components/dropdown'
import { fmt } from '@/features/ledger/ui'
import { useShell, useT } from '@/lib/shell'
import { cn } from '@/lib/utils'

const lbl = 'flex flex-col gap-1.5 text-[11px] opacity-85'
const input = 'field h-[43px] px-3.5'
const cols = 'grid-cols-[2.4fr_1fr_.8fr_.8fr_1fr_1.1fr_28px]'

export function DocForm({
  type,
  partyLabel,
  values,
  onEdit,
  onDone,
}: {
  type: DocType
  partyLabel: string
  values: NewDocInput
  onEdit: (v: NewDocInput) => void
  onDone: (saved: boolean) => void
}) {
  const { L, isMobile, refreshing, showToast } = useShell()
  const t = useT()
  const create = useCreateDoc(type)
  const { register, control, handleSubmit, formState, subscribe, getValues } = useForm<NewDocInput>({ resolver: zodResolver(newDocSchema), defaultValues: values })
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const items = useWatch({ control, name: 'items' })
  const subTotal = fmt(items.reduce((s, i) => s + i.qty * i.price, 0))
  const bad = (k: keyof NewDocInput) => formState.isSubmitted && !!formState.errors[k]

  // Drafts outlive this component (tab switches), so every edit is reported up.
  useEffect(() => {
    return subscribe({ formState: { values: true }, callback: ({ values }) => onEdit(values) })
  }, [subscribe, onEdit])

  const addItem = () => {
    const n = getValues('items').length
    append({ ...catalog[n % catalog.length], qty: (n % 4) + 1 })
  }
  const save = handleSubmit((v) =>
    create.mutate(v, {
      onSuccess: (row) => {
        showToast(t({ id: `${row.no} tersimpan`, en: `${row.no} saved` }))
        onDone(true)
      },
    }),
  )
  const rowOp = { opacity: refreshing ? 0.35 : 1 }

  return (
    <form onSubmit={save} className={cn('glass-card', isMobile ? 'p-4' : 'p-6')}>
      <div className={cn('grid items-start gap-3.5', isMobile ? 'grid-cols-1' : 'grid-cols-[2fr_1fr_1fr]')}>
        <label className={lbl}>
          <span>{partyLabel} *</span>
          <Controller
            control={control}
            name="party"
            render={({ field }) => (
              <Dropdown
                value={field.value}
                options={partiesFor(type)}
                onSelect={field.onChange}
                placeholder={t({ id: `Cari ${partyLabel.toLowerCase()}…`, en: `Search ${partyLabel.toLowerCase()}…` })}
                invalid={bad('party')}
                className="h-[43px]"
              />
            )}
          />
        </label>
        <label className={lbl}>
          <span>{L.date} *</span>
          <input {...register('date')} aria-invalid={bad('date') || undefined} className={cn(input, bad('date') && 'border-[#f472b6]')} />
        </label>
        <label className={lbl}>
          <span>{L.docNo}</span>
          <span className="field flex h-[43px] items-center justify-between px-3.5 opacity-90">
            {L.auto}
            <Controller
              control={control}
              name="autoNo"
              render={({ field }) => (
                <Switch.Root
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  aria-label={L.auto}
                  className="relative h-4 w-7 cursor-pointer rounded-lg bg-[rgba(var(--fg),.25)] data-[state=checked]:bg-(--ink)"
                >
                  <Switch.Thumb className="absolute top-0.5 left-0.5 block size-3 rounded-full bg-(--paper) transition-[left] duration-150 data-[state=checked]:left-[14px]" />
                </Switch.Root>
              )}
            />
          </span>
        </label>
      </div>

      <div className="mt-[22px] flex items-center justify-between">
        <span className={cn('text-[15px]', bad('items') && 'text-[#f472b6]')}>{L.itemDetail} *</span>
        <button type="button" onClick={addItem} className="cursor-pointer rounded-2xl bg-[rgba(var(--fg),.1)] px-3.5 py-2 text-xs hover:bg-[rgba(var(--fg),.2)]">
          + {L.addItem}
        </button>
      </div>
      <div className="mt-2.5 overflow-hidden rounded-2xl border border-[rgba(var(--fg),.12)]">
        {!isMobile && (
          <div className={cn('grid border-b border-[rgba(var(--fg),.1)] px-4 py-[11px] text-[11px] opacity-55', cols)}>
            <span>{L.itemName}</span>
            <span>{L.code}</span>
            <span>{L.qty}</span>
            <span>{L.unit}</span>
            <span>{L.unitPrice}</span>
            <span className="text-right">{L.total}</span>
            <span />
          </div>
        )}
        <div className="h-[200px] overflow-auto">
          {fields.map((f, i) => {
            const it = items[i] ?? f
            const del = (
              <button type="button" aria-label={t({ id: 'Hapus barang', en: 'Remove item' })} onClick={() => remove(i)} className="cursor-pointer opacity-60 hover:opacity-100">
                ×
              </button>
            )
            return isMobile ? (
              <div key={f.id} style={rowOp} className="flex animate-[fade_.2s] items-center gap-2.5 border-b border-[rgba(var(--fg),.07)] px-3.5 py-3 text-[13px] transition-opacity duration-[.25s]">
                <div className="min-w-0 flex-1">
                  <div className="truncate">{it.name}</div>
                  <div className="mt-[3px] text-[11px] opacity-60">
                    {it.sku} · {it.qty} {L.pcs} × {fmt(it.price)}
                  </div>
                </div>
                <span className="flex-none tabular-nums">{fmt(it.qty * it.price)}</span>
                <span className="flex size-7 flex-none items-center justify-center">{del}</span>
              </div>
            ) : (
              <div key={f.id} style={rowOp} className={cn('grid animate-[fade_.2s] items-center border-b border-[rgba(var(--fg),.07)] px-4 py-[11px] text-[13px] transition-opacity duration-[.25s]', cols)}>
                <span>{it.name}</span>
                <span className="opacity-65">{it.sku}</span>
                <span>{it.qty}</span>
                <span className="opacity-65">{L.pcs}</span>
                <span>{fmt(it.price)}</span>
                <span className="text-right">{fmt(it.qty * it.price)}</span>
                <span className="text-right">{del}</span>
              </div>
            )
          })}
          {fields.length === 0 && <div className="flex h-full items-center justify-center text-[13px] opacity-50">{L.noData}</div>}
        </div>
      </div>

      <div className={cn('mt-[18px] flex justify-between gap-[18px]', isMobile ? 'flex-col items-stretch' : 'flex-row items-center')}>
        <div className="flex gap-2">
          <button type="submit" disabled={create.isPending} className={cn('cursor-pointer rounded-[20px] bg-(--ink) px-[22px] py-3 text-center text-[13px] text-(--paper)', isMobile && 'flex-1')}>
            {L.save}
          </button>
          <button type="button" onClick={() => onDone(false)} className="cursor-pointer rounded-[20px] bg-[rgba(var(--fg),.1)] px-[18px] py-3 text-[13px]">
            {L.cancel}
          </button>
        </div>
        <div className={cn('flex gap-9 text-[11px]', isMobile ? 'justify-between' : 'justify-end')}>
          <div>
            <div className="opacity-60">{L.subTotal}</div>
            <div className="mt-1 text-[20px]">{subTotal}</div>
          </div>
          <div>
            <div className="opacity-60">{L.discount}</div>
            <div className="mt-1 text-[20px]">0</div>
          </div>
          <div>
            <div className="opacity-60">{L.total}</div>
            <div className="-mt-0.5 text-[30px] font-extralight">{subTotal}</div>
          </div>
        </div>
      </div>
    </form>
  )
}
