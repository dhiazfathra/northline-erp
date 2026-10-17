import { zodResolver } from '@hookform/resolvers/zod'
import { newTxSchema, txTypes, type NewTxInput } from '@northline/schemas/overview'
import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useCreateTx } from '@/api/overview'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useShell, useT } from '@/lib/shell'
import { cn } from '@/lib/utils'

const typeName: Record<NewTxInput['type'], { id: string; en: string }> = {
  invoice: { id: 'Faktur Penjualan', en: 'Sales Invoice' },
  bill: { id: 'Faktur Pembelian', en: 'Purchase Invoice' },
  receipt: { id: 'Penerimaan', en: 'Receipt' },
  payment: { id: 'Pembayaran', en: 'Payment' },
  journal: { id: 'Jurnal Umum', en: 'Journal' },
}
const tx = {
  title: { id: 'Transaksi Baru', en: 'New Transaction' },
  create: { id: 'Buat', en: 'Create' },
  created: { id: 'dibuat', en: 'created' },
}
const inputCls = 'field rounded-[14px] px-[14px] py-[12px] text-[13px] text-(--ink) outline-none'
const labelCls = 'flex flex-col gap-[6px] text-[11px] opacity-85'

export function NewTxModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { L, isMobile, showToast } = useShell()
  const t = useT()
  const create = useCreateTx()
  const { register, handleSubmit, control, setValue, reset, formState } = useForm<NewTxInput>({
    resolver: zodResolver(newTxSchema),
    defaultValues: { type: 'invoice', counterparty: '', amount: '', due: L.dueVal },
  })
  useEffect(() => {
    if (open) reset({ type: 'invoice', counterparty: '', amount: '', due: L.dueVal })
  }, [open, reset, L.dueVal])
  const type = useWatch({ control, name: 'type' })
  const submit = handleSubmit(async (v) => {
    await create.mutateAsync(v)
    showToast(`${t(typeName[v.type])} ${t(tx.created)} · ${v.counterparty}`)
    onClose()
  })
  const bad = (k: keyof NewTxInput) => formState.errors[k] && 'border-[#f87171]'

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        className={cn(
          'w-[min(480px,calc(100%-24px))] max-w-none gap-0 rounded-[28px] border border-[rgba(var(--fg),.16)] bg-(--panel) text-(--ink) ring-0 backdrop-blur-[26px] shadow-[0_30px_70px_rgba(0,0,0,.4)] animate-[pop_.22s_ease-out] sm:max-w-none',
          isMobile ? 'p-[20px]' : 'p-[28px]',
        )}
      >
        <form onSubmit={submit}>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-[24px] font-normal">{t(tx.title)}</DialogTitle>
            <button type="button" className="flex size-[32px] cursor-pointer items-center justify-center rounded-full bg-[rgba(var(--fg),.1)]" onClick={onClose}>
              ×
            </button>
          </div>
          <div className="mt-[16px] flex flex-wrap gap-[6px]">
            {txTypes.map((k) => (
              <button
                key={k}
                type="button"
                className={cn(
                  'cursor-pointer rounded-[16px] px-[12px] py-[7px] text-[11.5px]',
                  k === type ? 'bg-(--ink) text-(--paper)' : 'bg-[rgba(var(--fg),.08)]',
                )}
                onClick={() => setValue('type', k)}
              >
                {t(typeName[k])}
              </button>
            ))}
          </div>
          <div className="mt-[20px] flex flex-col gap-[12px]">
            <label className={labelCls}>
              {L.counterparty}
              <input placeholder={L.cpPh} className={cn(inputCls, bad('counterparty'))} {...register('counterparty')} />
            </label>
            <div className="grid grid-cols-2 gap-[12px]">
              <label className={labelCls}>
                {L.amount}
                <input placeholder="0.00" inputMode="decimal" className={cn(inputCls, bad('amount'))} {...register('amount')} />
              </label>
              <label className={labelCls}>
                {L.due}
                <input className={cn(inputCls, bad('due'))} {...register('due')} />
              </label>
            </div>
          </div>
          <div className="mt-[24px] flex justify-end gap-[8px]">
            <button type="button" className="cursor-pointer rounded-[20px] bg-[rgba(var(--fg),.1)] px-[18px] py-[12px] text-[13px]" onClick={onClose}>
              {L.cancel}
            </button>
            <button type="submit" disabled={create.isPending} className="cursor-pointer rounded-[20px] bg-(--ink) px-[20px] py-[12px] text-[13px] font-normal text-(--paper) disabled:opacity-60">
              {t(tx.create)} {t(typeName[type])}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
