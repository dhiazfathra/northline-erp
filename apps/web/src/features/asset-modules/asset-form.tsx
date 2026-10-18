import { zodResolver } from '@hookform/resolvers/zod'
import { assetExpenditureFormSchema, type AssetExpenditureForm } from '@northline/schemas/asset-modules'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, type ReactNode } from 'react'
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form'
import { fixedAssets, useCreateAssetExpenditure } from '@/api/asset-modules'
import { Dropdown } from '@/components/dropdown'
import { DatePicker } from '@/features/fixed-assets/parts'
import { useShell, useT } from '@/lib/shell'
import { DocFrame } from './doc-header'
import { idr, S } from './strings'

const PATH = '/asset-modules/new'
const DP = { dpp: 1_000_000, ppn: 110_000 }
const assetLabel = (a: { code: string; name: string }) => `${a.code} · ${a.name}`
const inputCls = 'w-full min-w-0 flex-1 rounded-[14px] bg-[rgba(var(--fg),.06)] px-[14px] py-[11px] text-[13px] text-(--ink) outline-none'
const bd = (bad?: unknown) => (bad ? 'border border-[#ec4899]' : 'border border-[rgba(var(--fg),.18)]')
const cellIn = 'w-full rounded-[10px] border border-[rgba(var(--fg),.18)] bg-[rgba(var(--fg),.06)] px-[10px] py-[7px] text-[13px] text-(--ink) outline-none'
const toolBtn = 'flex size-11 cursor-pointer items-center justify-center rounded-full text-[18px] text-(--ink) hover:bg-[rgba(var(--fg),.12)]'

function Field({ label, req, span, children }: { label: string; req?: boolean; span?: boolean; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-[11px]" style={span ? { gridColumn: '1 / -1' } : undefined}>
      <span className="opacity-75">
        {label} {req && <span className="text-[#ec4899]">*</span>}
      </span>
      {children}
    </label>
  )
}

export function AssetForm() {
  const { isMobile, showToast, setDirty } = useShell()
  const t = useT()
  const nav = useNavigate()
  const create = useCreateAssetExpenditure()
  const { register, control, handleSubmit, getValues, setValue, formState } = useForm<AssetExpenditureForm>({
    resolver: zodResolver(assetExpenditureFormSchema),
    defaultValues: { date: '17/10/2026', description: '', assetCode: '', qty: '1', note: '', dpp: '', applyDp: false, lines: [] },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' })
  const { errors, isDirty } = formState
  const [code, qty, dppS, applyDp] = useWatch({ control, name: ['assetCode', 'qty', 'dpp', 'applyDp'] })
  const picked = fixedAssets.find((a) => assetLabel(a) === code)
  const dpp = Number(dppS || 0)
  const ppn = Math.round(dpp * 0.11)
  const total = dpp + ppn - (applyDp ? DP.dpp + DP.ppn : 0)

  useEffect(() => {
    setDirty(PATH, isDirty)
    return () => setDirty(PATH, false)
  }, [isDirty, setDirty])

  const close = () => nav({ to: '/asset-modules' })
  const addLine = (label: string) => {
    const a = fixedAssets.find((x) => assetLabel(x) === label)
    if (a && !fields.some((f) => f.code === a.code)) append({ code: a.code, name: a.name, qty: '1', note: '' })
  }
  const ambil = () => {
    if (!picked) return showToast(t({ id: 'Pilih Kode Aset dulu', en: 'Pick an asset code first' }))
    if (fields.some((f) => f.code === picked.code)) return
    append({ code: picked.code, name: picked.name, qty: qty || '1', note: getValues('note') })
  }
  const save = handleSubmit(
    async (v) => {
      const row = await create.mutateAsync(v)
      setDirty(PATH, false)
      showToast(t({ id: `${row.number} tersimpan`, en: `${row.number} saved` }))
      close()
    },
    () => showToast(t({ id: 'Lengkapi data yang wajib', en: 'Complete the required fields' })),
  )

  return (
    <DocFrame
      mod={t(S.mod)}
      label={t(S.list)}
      subs={[
        { name: t(S.list), to: '/asset-modules' },
        { name: t({ id: 'Data Baru', en: 'New entry' }), to: PATH, active: true, onClose: close },
      ]}
    >
      <form onSubmit={save} className="glass-card" style={{ padding: isMobile ? 16 : 24 }}>
        <div className="flex flex-wrap items-start gap-4">
          <div className="grid min-w-0 flex-[1_1_520px] grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-[14px]">
            <Field label={t({ id: 'Tanggal', en: 'Date' })} req>
              <Controller control={control} name="date" render={({ field }) => <DatePicker dmy value={field.value} onChange={field.onChange} invalid={!!errors.date} />} />
            </Field>
            <Field label={t({ id: 'Kode Aset', en: 'Asset Code' })}>
              <Controller control={control} name="assetCode" render={({ field }) => <Dropdown value={field.value} options={fixedAssets.map(assetLabel)} onSelect={field.onChange} />} />
            </Field>
            <Field label={t({ id: 'Deskripsi Aset', en: 'Asset Description' })} req span>
              <input {...register('description')} placeholder={picked?.name ?? t({ id: 'mis. Servis besar forklift', en: 'e.g. Forklift overhaul' })} className={`${inputCls} ${bd(errors.description)}`} />
            </Field>
            <Field label={t({ id: 'Kuantitas', en: 'Quantity' })}>
              <input {...register('qty')} inputMode="numeric" className={`${inputCls} text-right ${bd(errors.qty)}`} />
            </Field>
            <Field label={t({ id: 'Keterangan', en: 'Notes' })} span>
              <textarea {...register('note')} rows={3} className={`${inputCls} resize-y ${bd()}`} />
            </Field>
          </div>
          <button type="button" onClick={ambil} className="flex flex-none cursor-pointer items-center gap-1.5 self-end rounded-[20px] border border-[rgba(var(--fg),.3)] px-[18px] py-2.5 text-[13px] text-(--ink) hover:bg-[rgba(var(--fg),.1)]">
            <i className="ph-light ph-download-simple" />
            Ambil
          </button>
          <div role="toolbar" aria-label="Aksi dokumen" className="ml-auto flex flex-none flex-col gap-2 rounded-3xl border border-[rgba(var(--fg),.12)] bg-[rgba(var(--fg),.06)] p-1.5">
            <button
              type="submit"
              title={t({ id: 'Simpan', en: 'Save' })}
              aria-label={t({ id: 'Simpan', en: 'Save' })}
              aria-disabled={!isDirty}
              disabled={create.isPending}
              className="flex size-11 items-center justify-center rounded-full bg-(--ink) text-[18px] text-(--paper)"
              style={{ opacity: isDirty ? 1 : 0.4, cursor: isDirty ? 'pointer' : 'not-allowed' }}
            >
              <i className={create.isPending ? 'ph-light ph-circle-notch animate-[spin_1s_linear_infinite]' : 'ph-light ph-floppy-disk'} />
            </button>
            <button type="button" title="Cetak" aria-label="Cetak" className={toolBtn} onClick={() => window.print()}>
              <i className="ph-light ph-printer" />
            </button>
            <button type="button" title="Lampiran" aria-label="Lampiran" className={toolBtn} onClick={() => showToast(t({ id: 'Lampiran belum tersedia', en: 'Attachments not available' }))}>
              <i className="ph-light ph-paperclip" />
            </button>
            <button type="button" title="Hapus" aria-label="Hapus" className={toolBtn} onClick={close}>
              <i className="ph-light ph-trash" />
            </button>
            <button type="button" title="Lainnya" aria-label="Lainnya" className={toolBtn} onClick={() => showToast(t({ id: 'Tidak ada aksi lain', en: 'No other actions' }))}>
              <i className="ph-light ph-dots-three" />
            </button>
          </div>
        </div>

        <div className="mt-[26px] border-b border-[rgba(var(--fg),.12)] pb-2.5 text-[15px]">{t({ id: 'Biaya', en: 'Cost' })}</div>
        <div className="mt-4 grid max-w-[820px] grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-[14px]">
          <Field label="DPP" req>
            <div className="flex items-center gap-2">
              <span className="flex-none text-[12px] opacity-60">Rp</span>
              <input {...register('dpp')} inputMode="numeric" placeholder="0" className={`${inputCls} text-right tabular-nums ${bd(errors.dpp)}`} />
            </div>
          </Field>
          <Field label="PPN 11%">
            <div className="flex items-center gap-2">
              <span className="flex-none text-[12px] opacity-60">Rp</span>
              <input value={idr(ppn)} readOnly className={`${inputCls} border border-[rgba(var(--fg),.12)] bg-[rgba(var(--fg),.03)] text-right tabular-nums opacity-80`} />
            </div>
          </Field>
        </div>

        <div className="mt-[26px] flex flex-wrap items-center justify-between gap-3">
          <span className="text-[15px]">
            Detail Aset <span className="text-[#ec4899]">*</span>
          </span>
          <span className="min-w-0 flex-[0_1_320px]">
            <Dropdown value="" options={fixedAssets.map(assetLabel)} onSelect={addLine} noClear invalid={!!errors.lines} placeholder={t({ id: 'Tambah aset…', en: 'Add asset…' })} className="h-[38px] px-3 py-[9px] text-[12.5px]" />
          </span>
        </div>
        <div className="mt-2.5 overflow-x-auto rounded-2xl border border-[rgba(var(--fg),.12)]">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-[1.2fr_2fr_.7fr_2fr_28px] gap-2.5 border-b border-[rgba(var(--fg),.1)] px-4 py-[11px] text-[11px] opacity-55">
              <span>Kode Aset</span>
              <span>Deskripsi Aset</span>
              <span className="text-right">Kuantitas</span>
              <span>Keterangan</span>
              <span />
            </div>
            {fields.map((f, i) => (
              <div key={f.id} data-rf-row="1" className="grid grid-cols-[1.2fr_2fr_.7fr_2fr_28px] items-center gap-2.5 border-b border-[rgba(var(--fg),.07)] px-4 py-2 text-[13px]">
                <span className="tabular-nums">{f.code}</span>
                <span>{f.name}</span>
                <input {...register(`lines.${i}.qty`)} inputMode="numeric" aria-label="Kuantitas" className={`${cellIn} text-right`} />
                <input {...register(`lines.${i}.note`)} aria-label="Keterangan" className={cellIn} />
                <button type="button" aria-label="Hapus baris" className="cursor-pointer text-right opacity-60" onClick={() => remove(i)}>
                  ×
                </button>
              </div>
            ))}
            {fields.length === 0 && <div className="p-[22px] text-center text-[13px] opacity-50">{t(S.empty)}</div>}
          </div>
        </div>

        <div className="mt-[22px] flex items-center gap-3 rounded-2xl border border-dashed border-[rgba(var(--fg),.3)] px-[18px] py-4">
          <i className="ph-light ph-hand-coins text-[22px] opacity-80" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="text-[14px]">Uang Muka</span>
            <div className="grid grid-cols-[24px_minmax(0,1.4fr)_repeat(3,minmax(0,1fr))] items-center gap-2.5 text-[12.5px]">
              <button
                type="button"
                role="checkbox"
                aria-checked={applyDp}
                aria-label="Terapkan uang muka SI.2026.10.00003"
                onClick={() => setValue('applyDp', !applyDp, { shouldDirty: true })}
                className="flex size-5 cursor-pointer items-center justify-center rounded-md border border-[rgba(var(--fg),.5)] p-0 text-[12px] text-(--paper)"
                style={{ background: applyDp ? 'var(--ink)' : 'transparent' }}
              >
                {applyDp ? '✓' : ''}
              </button>
              <span className="truncate">SI.2026.10.00003 · 04 Okt 2026</span>
              <span className="text-right tabular-nums">DPP {idr(DP.dpp)}</span>
              <span className="text-right tabular-nums">PPN {idr(DP.ppn)}</span>
              <span className="text-right tabular-nums">{idr(DP.dpp + DP.ppn)}</span>
            </div>
          </div>
        </div>

        <div className="mt-[14px] flex flex-wrap items-center justify-end gap-2.5">
          {[
            { l: 'DPP', v: dpp },
            { l: 'PPN', v: ppn },
            { l: 'Total', v: total, c: total < 0 ? '#ec4899' : undefined },
          ].map((x) => (
            <div key={x.l} className="flex min-w-[160px] flex-col gap-1 rounded-2xl bg-[rgba(var(--fg),.06)] px-4 py-3">
              <span className="text-[11px] opacity-60">{x.l}</span>
              <span className="text-right text-[15px] tabular-nums" style={{ color: x.c }}>{idr(x.v)}</span>
            </div>
          ))}
        </div>
      </form>
    </DocFrame>
  )
}
