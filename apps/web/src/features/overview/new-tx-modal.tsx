import { txTypes, type NewTxInput } from '@northline/schemas/overview'
import { useState, type FormEvent } from 'react'
import { useOpenTxForm } from '@/api/overview'
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
  create: { id: 'Lanjut ke', en: 'Continue to' },
}

export function NewTxModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { L, isMobile } = useShell()
  const t = useT()
  const openForm = useOpenTxForm()
  // the modal only picks the document type; the document form asks for everything else
  const [type, setType] = useState<NewTxInput['type']>('invoice')
  const close = () => {
    setType('invoice')
    onClose()
  }
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    close()
    await openForm(type)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
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
            <button type="button" className="flex size-[32px] cursor-pointer items-center justify-center rounded-full bg-[rgba(var(--fg),.1)]" onClick={close}>
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
                onClick={() => setType(k)}
              >
                {t(typeName[k])}
              </button>
            ))}
          </div>
          <div className="mt-[24px] flex justify-end gap-[8px]">
            <button type="button" className="cursor-pointer rounded-[20px] bg-[rgba(var(--fg),.1)] px-[18px] py-[12px] text-[13px]" onClick={close}>
              {L.cancel}
            </button>
            <button type="submit" className="cursor-pointer rounded-[20px] bg-(--ink) px-[20px] py-[12px] text-[13px] font-normal text-(--paper) disabled:opacity-60">
              {t(tx.create)} {t(typeName[type])}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
