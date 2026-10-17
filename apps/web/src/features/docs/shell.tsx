import type { DocRow, DocType, DocValues } from '@northline/schemas/docs'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Confirm, ConfirmAction, btnInk, btnOutline } from '@/features/ledger/ui'
import { useShell, useT } from '@/lib/shell'
import { cn } from '@/lib/utils'

export interface FormProps<V extends DocValues> {
  type: DocType
  /** Display name of the doc type, e.g. "Jurnal Umum". */
  docLabel: string
  record?: DocRow
  values: V
  dirty: boolean
  onEdit: (v: V) => void
  onSaved: () => void
  onDelete: (no: string) => void
  report: (problems: string[]) => void
  onClose: () => void
}

export const lbl = 'flex flex-col gap-1.5 text-[11px]'
export const fieldCls = 'field h-[41px] px-3.5'
export const cellInput = 'w-full min-w-0 rounded-[10px] border border-[rgba(var(--fg),.18)] bg-[rgba(var(--fg),.06)] px-2 py-1.5 text-[13px] text-(--ink) tabular-nums outline-none'
export const req = <span className="text-[#ec4899]">*</span>

/** "<Label> harus diisi" for every invalid top-level field. */
export function required(errors: object, labels: Record<string, string>) {
  return Object.keys(errors).map((k) => `${labels[k] ?? k} harus diisi`)
}

export const toNum = (s: string) => Number(s.replace(/[^\d]/g, '')) || 0

export function FormFrame({ rail, children }: { rail: ReactNode; children: ReactNode }) {
  const { isMobile } = useShell()
  return (
    <div className={cn('glass-card flex gap-4', isMobile ? 'flex-col-reverse p-4' : 'p-6')}>
      <div className="min-w-0 flex-1">{children}</div>
      {rail}
    </div>
  )
}

const railBtn =
  'flex size-11 cursor-pointer flex-col items-center justify-center rounded-full bg-transparent text-[18px] text-(--ink) hover:bg-[rgba(var(--fg),.1)] disabled:cursor-not-allowed disabled:opacity-40'

/** Right action rail: Simpan (Ctrl+S, enabled once dirty), Cetak, Lampiran, Hapus, Lainnya. */
export function Rail({ dirty, saving, onSave, onDelete, onClose }: { dirty: boolean; saving: boolean; onSave: () => void; onDelete: () => void; onClose: () => void }) {
  const { isMobile, showToast } = useShell()
  const t = useT()
  const fileId = useId()
  const [files, setFiles] = useState(0)
  const save = useRef(onSave)
  useEffect(() => {
    save.current = onSave
  })
  const can = dirty && !saving

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (can) save.current()
      }
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [can])

  const btn = (icon: string, label: string, onClick: () => void, o: { disabled?: boolean; primary?: boolean; badge?: number } = {}) => (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={o.disabled}
      onClick={onClick}
      className={cn(railBtn, 'relative', o.primary && 'bg-(--ink) text-(--paper) hover:bg-(--ink)')}
    >
      <i className={icon} />
      {!!o.badge && <span className="absolute -top-1 -right-1 rounded-full bg-[#ec4899] px-1.5 text-[10px] text-white">{o.badge}</span>}
    </button>
  )
  return (
    <div role="toolbar" className={cn('flex flex-none gap-2 self-start rounded-3xl border border-[rgba(var(--fg),.12)] bg-[rgba(var(--fg),.06)] p-1.5', isMobile ? 'flex-row self-end' : 'ml-auto flex-col')}>
      {btn('ph-light ph-floppy-disk', t({ id: 'Simpan [Ctrl + S]', en: 'Save [Ctrl + S]' }), onSave, { disabled: !can, primary: true })}
      {btn('ph-light ph-printer', t({ id: 'Cetak', en: 'Print' }), () => window.print())}
      {btn('ph-light ph-paperclip', t({ id: 'Lampiran', en: 'Attachments' }), () => document.getElementById(fileId)?.click(), { badge: files })}
      <input
        id={fileId}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          const n = e.target.files?.length ?? 0
          setFiles((f) => f + n)
          if (n) showToast(t({ id: `${n} lampiran ditambahkan`, en: `${n} attachment(s) added` }))
        }}
      />
      {btn('ph-light ph-trash', t({ id: 'Hapus', en: 'Delete' }), onDelete)}
      <DropdownMenu>
        <DropdownMenuTrigger className={railBtn} aria-label={t({ id: 'Lainnya', en: 'More' })} title={t({ id: 'Lainnya', en: 'More' })}>
          <i className="ph-light ph-dots-three" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="glass-pop min-w-[160px] rounded-2xl p-1.5 text-(--ink)">
          <DropdownMenuItem className="cursor-pointer rounded-[10px] px-2.5 py-2 text-[13px] text-(--ink) focus:bg-[rgba(var(--fg),.1)] focus:text-(--ink)" onSelect={onClose}>
            {t({ id: 'Tutup', en: 'Close' })}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export function Problems({ items, onClose }: { items: string[]; onClose: () => void }) {
  const t = useT()
  const { showToast } = useShell()
  return (
    <Confirm
      open={items.length > 0}
      onOpenChange={(o) => !o && onClose()}
      icon={<i className="ph-light ph-warning-circle text-[22px] text-[#ef4444]" />}
      title={t({ id: 'Terjadi Permasalahan pada Pemrosesan', en: 'There was a problem processing' })}
      actions={
        <>
          <button
            type="button"
            className={btnOutline}
            onClick={() => {
              void navigator.clipboard?.writeText(items.join('\n'))
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
        {items.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
    </Confirm>
  )
}

export function Totals({ rows }: { rows: { l: string; v: string; big?: boolean }[] }) {
  const { isMobile } = useShell()
  return (
    <div className={cn('flex flex-wrap gap-x-9 gap-y-3 text-[11px]', isMobile ? 'justify-between' : 'justify-end')}>
      {rows.map((r) => (
        <div key={r.l}>
          <div className="opacity-60">{r.l}</div>
          <div className={cn('tabular-nums', r.big ? '-mt-0.5 text-[30px] font-extralight' : 'mt-1 text-[20px]')}>{r.v}</div>
        </div>
      ))}
    </div>
  )
}
