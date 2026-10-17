import type { ReportRow } from '@northline/schemas/reports'
import { useState } from 'react'
import { useSaveLayout } from '@/api/reports'
import { Dropdown } from '@/components/dropdown'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useShell, useT } from '@/lib/shell'
import { cn } from '@/lib/utils'
import { colDefs, fmtDate, fmtNum, fontCss, fontDefaults, fontLabels, layoutDefault, paperMm, type ColId, type Filter, type FontKey, type Layout, type ShowKey } from './model'
import { Check, iconBtn, inp, kicker, modal, pill, Radios, xBtn } from './ui'

type Tr = { id: string; en: string }
const M = {
  kicker: { id: 'Edit tata letak laporan', en: 'Edit report layout' },
  tabs: [
    { id: 'Kolom', en: 'Columns' },
    { id: 'Filter', en: 'Filters' },
    { id: 'Header & Footer', en: 'Header & Footer' },
    { id: 'Halaman', en: 'Page' },
    { id: 'Font', en: 'Fonts' },
    { id: 'Angka & Tanggal', en: 'Numbers & Dates' },
    { id: 'Baris', en: 'Rows' },
  ],
  cAvail: { id: 'Kolom tersedia', en: 'Available columns' },
  cSearch: { id: 'Cari kolom', en: 'Search columns' },
  cHint: { id: 'Klik kolom untuk menambahkannya ke laporan.', en: 'Click a column to add it to the report.' },
  cNone: { id: 'Semua kolom sudah digunakan', en: 'All columns are in use' },
  cUsed: { id: 'Kolom digunakan', en: 'Columns in use' },
  cRemove: { id: 'Hapus kolom', en: 'Remove column' },
  cSettings: { id: 'Pengaturan kolom', en: 'Column settings' },
  cRename: { id: 'Nama kolom', en: 'Column name' },
  fEmpty: { id: 'Belum ada filter. Semua baris akun ditampilkan.', en: 'No filters yet. All account rows are shown.' },
  fAdd: { id: 'Tambah', en: 'Add' },
  fEdit: { id: 'Ubah', en: 'Edit' },
  fDel: { id: 'Hapus', en: 'Delete' },
  fField: { id: 'Kolom', en: 'Field' },
  fOp: { id: 'Kondisi', en: 'Condition' },
  fVal: { id: 'Nilai', en: 'Value' },
  fApply: { id: 'Terapkan', en: 'Apply' },
  fNote: { id: 'Filter hanya berlaku untuk baris akun; baris grup dan total tetap tampil.', en: 'Filters apply to account rows only; group and total rows stay visible.' },
  head: { id: 'Header', en: 'Header' },
  foot: { id: 'Footer', en: 'Footer' },
  pPaper: { id: 'Kertas', en: 'Paper' },
  pSize: { id: 'Ukuran', en: 'Size' },
  pOri: { id: 'Orientasi', en: 'Orientation' },
  pPortrait: { id: 'Potret', en: 'Portrait' },
  pLand: { id: 'Lanskap', en: 'Landscape' },
  pFlex: { id: 'Lebar fleksibel (tanpa batas halaman)', en: 'Flexible width (no page break)' },
  pMar: { id: 'Margin', en: 'Margins' },
  pPreview: { id: 'Pratinjau', en: 'Preview' },
  mar: { t: { id: 'Atas', en: 'Top' }, b: { id: 'Bawah', en: 'Bottom' }, l: { id: 'Kiri', en: 'Left' }, r: { id: 'Kanan', en: 'Right' } },
  nEl: { id: 'Elemen', en: 'Element' },
  nCustom: { id: 'Diubah', en: 'Customised' },
  nFont: { id: 'Font', en: 'Font' },
  nSize: { id: 'Ukuran', en: 'Size' },
  nStyle: { id: 'Gaya', en: 'Style' },
  nColor: { id: 'Warna', en: 'Colour' },
  nAlign: { id: 'Perataan', en: 'Alignment' },
  nWrap: { id: 'Teks', en: 'Text' },
  nWrapL: { id: 'Bungkus teks panjang', en: 'Wrap long text' },
  nSample: { id: 'Contoh', en: 'Sample' },
  nReset: { id: 'Kembalikan bawaan', en: 'Reset to default' },
  dFmt: { id: 'Format tanggal', en: 'Date format' },
  dDec: { id: 'Pemisah', en: 'Separators' },
  dNeg: { id: 'Angka negatif', en: 'Negative numbers' },
  dRedL: { id: 'Warna negatif', en: 'Negative colour' },
  dRed: { id: 'Tampilkan merah', en: 'Show in red' },
  dDp: { id: 'Desimal', en: 'Decimals' },
  dPreview: { id: 'Pratinjau', en: 'Preview' },
  rDesc: { id: 'Deskripsi', en: 'Description' },
  rVal: { id: 'Nilai', en: 'Value' },
  rType: { id: 'Jenis', en: 'Type' },
  rPos: { id: 'Posisi', en: 'Position' },
  rAdd: { id: 'Tambah baris', en: 'Add row' },
  rDel: { id: 'Hapus baris', en: 'Delete row' },
  rReset: { id: 'Kembalikan baris', en: 'Reset rows' },
  rNote: { id: 'Perubahan baris hanya memengaruhi tampilan, bukan data akuntansi.', en: 'Row edits change the display only, not the accounting data.' },
  resetAll: { id: 'Kembalikan semua', en: 'Reset all' },
  saved: { id: 'Tata letak disimpan', en: 'Layout saved' },
}
const hf: { key: ShowKey; label: Tr; items: { key: ShowKey; label: Tr; text?: 'ti' | 'sys' | 'add'; ph?: Tr }[] }[] = [
  {
    key: 'head',
    label: M.head,
    items: [
      { key: 'co', label: { id: 'Nama perusahaan', en: 'Company name' } },
      { key: 'sub', label: { id: 'Kategori laporan', en: 'Report category' } },
      { key: 'ti', label: { id: 'Judul laporan', en: 'Report title' }, text: 'ti', ph: { id: 'Gunakan nama laporan', en: 'Use report name' } },
      { key: 'fil', label: { id: 'Info filter', en: 'Filter info' } },
      { key: 'colT', label: { id: 'Judul kolom', en: 'Column titles' } },
    ],
  },
  {
    key: 'foot',
    label: M.foot,
    items: [
      { key: 'pd', label: { id: 'Tanggal cetak', en: 'Printed date' } },
      { key: 'sys', label: { id: 'Teks sistem', en: 'System text' }, text: 'sys', ph: { id: 'cth. Northline ERP', en: 'e.g. Northline ERP' } },
      { key: 'pn', label: { id: 'Nomor halaman', en: 'Page number' } },
      { key: 'add', label: { id: 'Teks tambahan', en: 'Additional text' }, text: 'add', ph: { id: 'cth. Disetujui oleh Direktur Keuangan', en: 'e.g. Approved by the CFO' } },
    ],
  },
]
const fFields = ['Deskripsi', 'Kode Akun', 'Nilai']
const fOps = ['mengandung', 'sama dengan', 'lebih dari', 'kurang dari', 'kosong', 'tidak kosong']
const kinds: { k: ReportRow['k']; label: string }[] = [
  { k: 'sec', label: 'Bagian' },
  { k: 'grp', label: 'Grup' },
  { k: 'acc', label: 'Akun' },
  { k: 'sub', label: 'Subtotal' },
  { k: 'tot', label: 'Total' },
]
const fams = ['Outfit', 'Geist Variable', 'Georgia', 'Times New Roman', 'Arial', 'Courier New']
const MM = 0.6

export function LayoutDialog({ open, onClose, id, name, layout, cols, rows }: { open: boolean; onClose: () => void; id: string; name: string; layout: Layout; cols: NonNullable<Layout['cols']>; rows: ReportRow[] }) {
  const { isMobile, showToast } = useShell()
  const t = useT()
  const save = useSaveLayout(id)
  const [d, setD] = useState<Layout>(() => ({ ...layout, cols }))
  const [tab, setTab] = useState(0)
  const [q, setQ] = useState('')
  const [gear, setGear] = useState<ColId | null>(null)
  const [fSel, setFSel] = useState(-1)
  const [fForm, setFForm] = useState<(Filter & { i: number }) | null>(null)
  const [el, setEl] = useState<FontKey>('ti')
  const [rSel, setRSel] = useState(0)

  const set = (p: Partial<Layout>) => setD((x) => ({ ...x, ...p }))
  const dCols = d.cols ?? cols
  const dRows = d.rows ?? rows
  const setRows = (r: ReportRow[]) => set({ rows: r })
  const two = isMobile ? 'minmax(0,1fr)' : 'repeat(2,minmax(0,1fr))'

  const colTab = (
    <div className="grid items-start gap-x-6 gap-y-5" style={{ gridTemplateColumns: two }}>
      <div className="flex min-w-0 flex-col gap-2.5">
        <span className={kicker}>{t(M.cAvail)}</span>
        <div className="relative">
          <i className="ph-light ph-magnifying-glass absolute top-1/2 left-3 -translate-y-1/2 text-[15px] opacity-55" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t(M.cSearch)} className={cn(inp, 'pl-[34px]')} />
        </div>
        <div className="overflow-hidden rounded-[16px] border border-[rgba(var(--fg),.12)]">
          {(() => {
            const avail = (Object.keys(colDefs) as ColId[]).filter((c) => !dCols.some((x) => x.id === c) && t(colDefs[c]).toLowerCase().includes(q.toLowerCase()))
            return avail.length ? (
              avail.map((c) => (
                <button key={c} type="button" onClick={() => set({ cols: [...dCols, { id: c, name: '', on: true }] })} className="flex w-full cursor-pointer items-center gap-2.5 border-b border-[rgba(var(--fg),.08)] px-3.5 py-3 text-left text-[13px] last:border-b-0 hover:bg-[rgba(var(--fg),.06)]">
                  <i className="ph-light ph-plus-circle text-[17px] opacity-75" />
                  <span className="min-w-0 flex-1">{t(colDefs[c])}</span>
                </button>
              ))
            ) : (
              <div className="p-3.5 text-[12.5px] opacity-55">{t(M.cNone)}</div>
            )
          })()}
        </div>
        <span className="text-[11.5px] opacity-55">{t(M.cHint)}</span>
      </div>
      <div className="flex min-w-0 flex-col gap-2.5">
        <span className={kicker}>{t(M.cUsed)}</span>
        <div className="overflow-hidden rounded-[16px] border border-[rgba(var(--fg),.12)]">
          <div className="flex items-center gap-3 border-b border-[rgba(var(--fg),.08)] py-2 pr-2 pl-3.5 text-[13px]">
            <Check on disabled className="py-0 opacity-40" />
            <span className="min-w-0 flex-1">{t(M.rDesc)}</span>
            <span className="py-[7px] text-[11px] opacity-50">{t({ id: 'Wajib', en: 'Required' })}</span>
          </div>
          {dCols.map((c, i) => {
            const upd = (p: Partial<typeof c>) => set({ cols: dCols.map((x, j) => (j === i ? { ...x, ...p } : x)) })
            return (
              <div key={c.id} className="border-b border-[rgba(var(--fg),.08)] last:border-b-0">
                <div className="flex items-center gap-3 py-2 pr-2 pl-3.5 text-[13px]">
                  <Check on={c.on} onChange={(on) => upd({ on })} className="py-0" />
                  <span className="min-w-0 flex-1">{c.name || t(colDefs[c.id])}</span>
                  {c.id !== 'cur' && (
                    <button type="button" title={t(M.cRemove)} aria-label={t(M.cRemove)} className={cn(iconBtn, 'opacity-70 hover:opacity-100')} onClick={() => set({ cols: dCols.filter((_, j) => j !== i) })}>
                      <i className="ph-light ph-trash text-[15px]" />
                    </button>
                  )}
                  <button type="button" title={t(M.cSettings)} aria-label={t(M.cSettings)} className={cn(iconBtn, gear === c.id && 'bg-[rgba(var(--fg),.14)]')} onClick={() => setGear(gear === c.id ? null : c.id)}>
                    <i className="ph-light ph-gear-six text-[16px]" />
                  </button>
                </div>
                {gear === c.id && (
                  <label className="flex flex-col gap-1.5 pr-3.5 pb-3.5 pl-[42px] text-[11px]">
                    {t(M.cRename)}
                    <input value={c.name} placeholder={t(colDefs[c.id])} onChange={(e) => upd({ name: e.target.value })} className={inp} />
                  </label>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )

  const fltTab = (
    <div className="flex max-w-[640px] flex-col gap-2.5">
      <span className={kicker}>{t(M.tabs[1])}</span>
      <div className="min-h-[110px] overflow-hidden rounded-[16px] border border-[rgba(var(--fg),.12)]">
        {d.flt.map((f, i) => (
          <button key={i} type="button" onClick={() => setFSel(i === fSel ? -1 : i)} className={cn('flex w-full cursor-pointer items-center gap-2.5 border-b border-[rgba(var(--fg),.08)] px-3.5 py-3 text-left text-[13px] hover:bg-[rgba(var(--fg),.08)]', i === fSel && 'bg-[rgba(var(--fg),.1)]')}>
            <i className="ph-light ph-funnel-simple text-[16px] opacity-65" />
            <span className="min-w-0">
              <span className="font-medium">{f.f}</span> <span className="opacity-70">{f.op}</span> {f.v}
            </span>
          </button>
        ))}
        {!d.flt.length && <div className="px-3.5 py-4 text-[12.5px] leading-[1.45] opacity-55">{t(M.fEmpty)}</div>}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {[
          { label: M.fAdd, icon: 'ph-plus', ok: true, go: () => setFForm({ f: 'Deskripsi', op: 'mengandung', v: '', i: -1 }), primary: true },
          { label: M.fEdit, icon: 'ph-pencil-simple', ok: fSel >= 0, go: () => setFForm({ ...d.flt[fSel], i: fSel }) },
          {
            label: M.fDel,
            icon: 'ph-trash',
            ok: fSel >= 0,
            go: () => {
              set({ flt: d.flt.filter((_, j) => j !== fSel) })
              setFSel(-1)
            },
          },
        ].map((b) => (
          <button key={b.icon} type="button" disabled={!b.ok} onClick={b.go} className={cn(pill, 'disabled:cursor-default disabled:opacity-40', b.primary ? 'bg-(--ink) text-(--paper)' : 'bg-[rgba(var(--fg),.1)]')}>
            <i className={cn('ph-light text-[15px]', b.icon)} />
            {t(b.label)}
          </button>
        ))}
      </div>
      {fForm && (
        <div className="mt-1.5 grid animate-[pop_.16s_ease-out] items-end gap-3 rounded-[18px] border border-[rgba(var(--fg),.12)] bg-[rgba(var(--fg),.06)] p-4" style={{ gridTemplateColumns: isMobile ? 'minmax(0,1fr)' : 'repeat(3,minmax(0,1fr)) auto' }}>
          <label className="flex min-w-0 flex-col gap-1.5 text-[11px]">
            {t(M.fField)}
            <Dropdown value={fForm.f} options={fFields} noClear onSelect={(f) => setFForm({ ...fForm, f })} className="rounded-[12px]" />
          </label>
          <label className="flex min-w-0 flex-col gap-1.5 text-[11px]">
            {t(M.fOp)}
            <Dropdown value={fForm.op} options={fOps} noClear onSelect={(op) => setFForm({ ...fForm, op })} className="rounded-[12px]" />
          </label>
          <label className="flex min-w-0 flex-col gap-1.5 text-[11px]">
            {t(M.fVal)}
            {fForm.op.includes('kosong') ? <span className={cn(inp, 'opacity-40')}>—</span> : <input value={fForm.v} onChange={(e) => setFForm({ ...fForm, v: e.target.value })} placeholder={fForm.f === 'Nilai' ? '1000000' : 'Bank'} className={inp} />}
          </label>
          <div className="flex gap-1.5">
            <button type="button" className={cn(pill, 'bg-[rgba(var(--fg),.1)]')} onClick={() => setFForm(null)}>
              <i className="ph-light ph-x text-[15px]" />
              {t({ id: 'Batal', en: 'Cancel' })}
            </button>
            <button
              type="button"
              className={cn(pill, 'bg-(--ink) text-(--paper)')}
              onClick={() => {
                const { i, ...f } = fForm
                set({ flt: i < 0 ? [...d.flt, f] : d.flt.map((x, j) => (j === i ? f : x)) })
                setFForm(null)
              }}
            >
              <i className="ph-light ph-check text-[15px]" />
              {t(M.fApply)}
            </button>
          </div>
        </div>
      )}
      <span className="text-[11.5px] leading-[1.45] opacity-55">{t(M.fNote)}</span>
    </div>
  )

  const hfTab = (
    <div className="grid items-start gap-x-8 gap-y-6" style={{ gridTemplateColumns: two }}>
      {hf.map((h) => (
        <div key={h.key} className="flex min-w-0 flex-col">
          <Check on={d.show[h.key]} onChange={(v) => set({ show: { ...d.show, [h.key]: v } })} className="text-[14px]">
            {t(h.label)}
          </Check>
          <div className="mt-1 flex flex-col pl-[26px] transition-opacity duration-150" style={{ opacity: d.show[h.key] ? 1 : 0.4 }}>
            {h.items.map((o) => (
              <div key={o.key} className="flex flex-col gap-1">
                <Check on={d.show[o.key]} onChange={(v) => set({ show: { ...d.show, [o.key]: v } })}>
                  {t(o.label)}
                </Check>
                {o.text && d.show[o.key] && (
                  <div className="relative mb-2 ml-[26px]">
                    <input value={d.text[o.text]} placeholder={o.ph && t(o.ph)} onChange={(e) => set({ text: { ...d.text, [o.text!]: e.target.value } })} className={cn(inp, 'pr-9')} />
                    <button type="button" aria-label="×" onClick={() => set({ text: { ...d.text, [o.text!]: '' } })} className="absolute top-1/2 right-2 flex size-[22px] -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-[14px] opacity-60 hover:bg-[rgba(var(--fg),.12)] hover:opacity-100">
                      ×
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )

  const pg = d.page
  const setPg = (p: Partial<Layout['page']>) => set({ page: { ...pg, ...p } })
  const [pw, ph] = paperMm[pg.size]
  const [w, h] = pg.ori === 'l' ? [ph, pw] : [pw, ph]
  const pgTab = (
    <div className="grid items-start gap-x-8 gap-y-6" style={{ gridTemplateColumns: isMobile ? 'minmax(0,1fr)' : 'minmax(0,1fr) minmax(0,1fr) 220px' }}>
      <div className="flex min-w-0 flex-col gap-3.5">
        <span className={kicker}>{t(M.pPaper)}</span>
        <label className="flex flex-col gap-1.5 text-[11px]">
          {t(M.pSize)}
          <Dropdown value={pg.size} options={Object.keys(paperMm)} noClear onSelect={(size) => setPg({ size })} className="rounded-[12px]" />
        </label>
        <div className="flex flex-col gap-0.5 text-[11px]">
          {t(M.pOri)}
          <Radios value={pg.ori} onChange={(ori) => setPg({ ori })} className="flex-row flex-wrap gap-5" options={[{ v: 'p', label: t(M.pPortrait) }, { v: 'l', label: t(M.pLand) }]} />
        </div>
        <Check on={pg.flex} onChange={(flex) => setPg({ flex })}>
          {t(M.pFlex)}
        </Check>
      </div>
      <div className="flex min-w-0 flex-col gap-3.5">
        <span className={kicker}>{t(M.pMar)}</span>
        <div className="grid grid-cols-2 gap-3">
          {(['t', 'b', 'l', 'r'] as const).map((k) => (
            <label key={k} className="flex min-w-0 flex-col gap-1.5 text-[11px]">
              {t(M.mar[k])}
              <div className="relative">
                <input type="number" min={0} max={60} value={pg.mar[k]} onChange={(e) => setPg({ mar: { ...pg.mar, [k]: Math.min(60, Math.max(0, +e.target.value || 0)) } })} className={cn(inp, 'pr-[42px] text-right')} />
                <span className="absolute top-1/2 right-3 -translate-y-1/2 text-[11.5px] opacity-55">mm</span>
              </div>
            </label>
          ))}
        </div>
      </div>
      <div className="flex min-w-0 flex-col items-center gap-3">
        <span className={cn(kicker, 'self-start')}>{t(M.pPreview)}</span>
        <div className="box-border rounded-[3px] bg-white shadow-[0_10px_26px_rgba(0,0,0,.3)] transition-[width,height,padding] duration-200" style={{ width: w * MM, height: pg.flex ? 'auto' : h * MM, padding: `${pg.mar.t * MM}px ${pg.mar.r * MM}px ${pg.mar.b * MM}px ${pg.mar.l * MM}px` }}>
          <div className="box-border flex size-full flex-col gap-[5px] overflow-hidden border border-dashed border-[#a5b4fc] p-1.5" style={{ borderBottomStyle: pg.flex ? 'none' : 'dashed' }}>
            <span className="h-[5px] w-2/5 flex-none rounded-[2px] bg-[#a1a1aa]" />
            <span className="mt-1 h-2 w-[70%] flex-none rounded-[2px] bg-[#d4d4d8]" />
            {[100, 86, 92, 78, 95, 70, 88].map((x, i) => (
              <span key={i} className={cn('h-[3px] flex-none bg-[#e4e4e7]', i === 0 && 'mt-1.5')} style={{ width: `${x}%` }} />
            ))}
          </div>
        </div>
        <span className="text-[11px] opacity-60">
          {w} × {h} mm
        </span>
      </div>
    </div>
  )

  const fo = d.fonts[el]
  const setFo = (p: Partial<typeof fo>) => set({ fonts: { ...d.fonts, [el]: { ...fo, ...p } } })
  const modded = (k: FontKey) => JSON.stringify(d.fonts[k]) !== JSON.stringify(fontDefaults[k])
  const seg = 'flex w-fit gap-0.5 rounded-[14px] bg-[rgba(var(--fg),.08)] p-[3px]'
  const segB = (on: boolean) => cn('flex h-[30px] w-[34px] cursor-pointer items-center justify-center rounded-[11px]', on && 'bg-(--ink) text-(--paper)')
  const fontTab = (
    <div className="grid items-start gap-x-7 gap-y-5" style={{ gridTemplateColumns: isMobile ? 'minmax(0,1fr)' : '220px minmax(0,1fr)' }}>
      <div className="flex min-w-0 flex-col gap-2.5">
        <span className={kicker}>{t(M.nEl)}</span>
        <div className="flex flex-col rounded-[16px] border border-[rgba(var(--fg),.12)] p-1">
          {(Object.keys(fontLabels) as FontKey[]).map((k) => (
            <button key={k} type="button" onClick={() => setEl(k)} className={cn('flex cursor-pointer items-center justify-between gap-2 rounded-[12px] px-3 py-2 text-left text-[13px] hover:bg-[rgba(var(--fg),.08)]', k === el && 'bg-[rgba(var(--fg),.12)]')}>
              <span>{t(fontLabels[k])}</span>
              {modded(k) && <span title={t(M.nCustom)} className="size-[7px] rounded-full bg-[#818cf8]" />}
            </button>
          ))}
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-[18px]">
        <div className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-x-4 gap-y-3 text-[13px]">
          <span>{t(M.nFont)}</span>
          <Dropdown value={fo.ff} options={fams} noClear onSelect={(ff) => setFo({ ff })} className="max-w-[280px] rounded-[12px]" />
          <span>{t(M.nSize)}</span>
          <div className="flex items-center gap-2">
            <input type="number" min={6} max={48} step={0.5} value={fo.sz} onChange={(e) => setFo({ sz: Math.min(48, Math.max(6, +e.target.value || 6)) })} className={cn(inp, 'w-24 text-right')} />
            <span className="text-[12px] opacity-60">px</span>
          </div>
          <span>{t(M.nStyle)}</span>
          <div className={seg}>
            {(['b', 'i', 'u'] as const).map((k) => (
              <button key={k} type="button" aria-pressed={fo[k]} title={k} className={segB(fo[k])} onClick={() => setFo({ [k]: !fo[k] })}>
                <i className={cn('ph-light text-[16px]', { b: 'ph-text-b', i: 'ph-text-italic', u: 'ph-text-underline' }[k])} />
              </button>
            ))}
          </div>
          <span>{t(M.nColor)}</span>
          <div className="flex items-center gap-2.5">
            <input type="color" value={fo.c} onChange={(e) => setFo({ c: e.target.value })} className="box-border h-[34px] w-[46px] cursor-pointer rounded-[10px] border border-[rgba(var(--fg),.18)] bg-[rgba(var(--fg),.06)] px-[3px] py-0.5" />
            <span className="text-[12px] uppercase tabular-nums opacity-70">{fo.c}</span>
            <button type="button" title={t(M.nReset)} aria-label={t(M.nReset)} className={cn(iconBtn, 'size-7 opacity-70 hover:opacity-100')} onClick={() => setFo({ c: fontDefaults[el].c })}>
              <i className="ph-light ph-arrow-counter-clockwise text-[14px]" />
            </button>
          </div>
          <span>{t(M.nAlign)}</span>
          <div className={seg}>
            {(['left', 'center', 'right'] as const).map((a) => (
              <button key={a} type="button" aria-pressed={fo.ta === a} title={a} className={segB(fo.ta === a)} onClick={() => setFo({ ta: a })}>
                <i className={cn('ph-light text-[16px]', `ph-text-align-${a}`)} />
              </button>
            ))}
          </div>
          <span>{t(M.nWrap)}</span>
          <Check on={fo.wrap} onChange={(wrap) => setFo({ wrap })}>
            {t(M.nWrapL)}
          </Check>
        </div>
        <div className="flex flex-col gap-2">
          <span className={kicker}>{t(M.nSample)}</span>
          <div className="overflow-hidden rounded-[14px] bg-white px-5 py-[18px]">
            <div className="overflow-hidden text-ellipsis" style={{ ...fontCss(fo), whiteSpace: fo.wrap ? 'normal' : 'nowrap' }}>
              {el === 'co' ? 'PT Harbor Nusantara' : el === 'ti' ? name : el === 'pn' ? 'Halaman 1 dari 1' : `${t(fontLabels[el])} · 1.284.600.000`}
            </div>
          </div>
        </div>
        {modded(el) && (
          <button type="button" className="flex cursor-pointer items-center gap-1.5 self-start text-[12.5px] opacity-75 hover:opacity-100" onClick={() => set({ fonts: { ...d.fonts, [el]: fontDefaults[el] } })}>
            <i className="ph-light ph-arrow-counter-clockwise text-[14px]" />
            {t(M.nReset)}
          </button>
        )}
      </div>
    </div>
  )

  const nf = d.num
  const setNf = (p: Partial<Layout['num']>) => set({ num: { ...nf, ...p } })
  const numTab = (
    <div className="grid max-w-[760px] items-start gap-x-6 gap-y-4 text-[13px]" style={{ gridTemplateColumns: isMobile ? 'minmax(0,1fr)' : '160px minmax(0,1fr)' }}>
      <span className="pt-2.5">{t(M.dFmt)}</span>
      <Dropdown value={nf.df} options={['dd/mm/yyyy', 'dd mmm yyyy', 'yyyy-mm-dd']} noClear onSelect={(df) => setNf({ df })} className="max-w-[280px] rounded-[12px]" />
      <span className="pt-[7px]">{t(M.dDec)}</span>
      <Radios value={nf.dec} onChange={(dec) => setNf({ dec })} options={[{ v: 'id', label: '1.234.567,89' }, { v: 'en', label: '1,234,567.89' }, { v: 'sp', label: '1 234 567,89' }]} />
      <span className="pt-[7px]">{t(M.dNeg)}</span>
      <Radios
        value={nf.neg}
        onChange={(neg) => setNf({ neg })}
        options={(['minus', 'paren', 'trail'] as const).map((v) => ({
          v,
          label: (
            <>
              {{ minus: t({ id: 'Tanda minus', en: 'Minus sign' }), paren: t({ id: 'Tanda kurung', en: 'Parentheses' }), trail: t({ id: 'Minus di belakang', en: 'Trailing minus' }) }[v]}
              <span className="tabular-nums opacity-55">{fmtNum(-1234, { ...nf, neg: v, dp: 0 })}</span>
            </>
          ),
        }))}
      />
      <span className="pt-[7px]">{t(M.dRedL)}</span>
      <Check on={nf.red} onChange={(red) => setNf({ red })}>
        {t(M.dRed)}
      </Check>
      <span className="pt-2.5">{t(M.dDp)}</span>
      <input type="number" min={0} max={6} value={nf.dp} onChange={(e) => setNf({ dp: Math.min(6, Math.max(0, Math.round(+e.target.value || 0))) })} className={cn(inp, 'w-24 text-right')} />
      <span className="pt-3.5">{t(M.dPreview)}</span>
      <div className="box-border flex w-fit max-w-full flex-wrap gap-x-7 gap-y-2 rounded-[14px] bg-white px-[18px] py-3.5 tabular-nums text-[#18181b]">
        <span className="text-[#71717a]">{fmtDate('2026-10-17', nf.df)}</span>
        {[1_284_600_000.5, -12_450_000, 0].map((n) => (
          <span key={n} style={{ color: n < 0 && nf.red ? '#dc2626' : undefined }}>
            {fmtNum(n, nf)}
          </span>
        ))}
      </div>
    </div>
  )

  const sel = dRows[rSel]
  const updRow = (p: Partial<ReportRow>) => setRows(dRows.map((r, i) => (i === rSel ? { ...r, ...p } : r)))
  const move = (to: number) => {
    if (!sel || to < 0 || to >= dRows.length) return
    const r = dRows.filter((_, i) => i !== rSel)
    r.splice(to, 0, sel)
    setRows(r)
    setRSel(to)
  }
  const rowStyle: Record<ReportRow['k'], string> = { sec: 'text-[11px] font-semibold tracking-[.9px] uppercase text-[#4338ca] min-h-8', grp: 'font-medium min-h-7', acc: 'pl-6 min-h-[26px] text-[#3f3f46]', sub: 'font-medium min-h-7', tot: 'font-semibold min-h-8' }
  const rowTab = (
    <div className="grid items-start gap-x-6 gap-y-5" style={{ gridTemplateColumns: two }}>
      <div className="flex max-h-[470px] flex-col overflow-hidden rounded-[16px] bg-white text-[#18181b]" style={{ fontFamily: 'Outfit,sans-serif' }}>
        <div className="mx-[18px] flex flex-none justify-between border-b border-[#18181b] pt-3.5 pb-[7px] text-[9.5px] font-medium uppercase tracking-[.7px] text-[#71717a]">
          <span>{t(M.rDesc)}</span>
          <span>{t(M.rVal)}</span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pt-1.5 pb-2.5">
          {dRows.map((r, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setRSel(i)}
              className={cn('flex w-full cursor-pointer items-center justify-between gap-3 rounded-[8px] px-2.5 py-1 text-left text-[12.5px] hover:bg-[#f4f4f5]', rowStyle[r.k], i === rSel && 'bg-[#eef2ff] shadow-[inset_0_0_0_1.5px_#818cf8] hover:bg-[#eef2ff]')}
            >
              <span className="min-w-0 truncate">{r.t || '—'}</span>
              <span className="flex-none font-normal tracking-normal text-[#71717a] normal-case">{r.cur === undefined ? '' : fmtNum(r.cur, d.num)}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-3.5">
        {sel && (
          <div className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-x-3.5 gap-y-3 rounded-[18px] border border-[rgba(var(--fg),.12)] p-[18px] text-[13px]">
            <span>{t(M.rDesc)}</span>
            <div className="relative">
              <input value={sel.t} onChange={(e) => updRow({ t: e.target.value })} className={cn(inp, 'pr-9')} />
              <button type="button" aria-label="×" onClick={() => updRow({ t: '' })} className="absolute top-1/2 right-2 flex size-[22px] -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-[14px] opacity-60 hover:bg-[rgba(var(--fg),.12)] hover:opacity-100">
                ×
              </button>
            </div>
            <span>{t(M.rType)}</span>
            <Dropdown value={kinds.find((k) => k.k === sel.k)!.label} options={kinds.map((k) => k.label)} noClear onSelect={(v) => updRow({ k: kinds.find((k) => k.label === v)!.k })} className="max-w-[240px] rounded-[12px]" />
            <span>{t(M.rPos)}</span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { icon: 'ph-arrow-line-up', label: { id: 'Ke paling atas', en: 'To top' }, to: 0 },
                { icon: 'ph-arrow-up', label: { id: 'Naik', en: 'Up' }, to: rSel - 1 },
                { icon: 'ph-arrow-down', label: { id: 'Turun', en: 'Down' }, to: rSel + 1 },
                { icon: 'ph-arrow-line-down', label: { id: 'Ke paling bawah', en: 'To bottom' }, to: dRows.length - 1 },
              ].map((b) => (
                <button key={b.icon} type="button" title={t(b.label)} aria-label={t(b.label)} onClick={() => move(b.to)} className="flex h-[34px] w-10 cursor-pointer items-center justify-center rounded-[12px] bg-[rgba(var(--fg),.1)] hover:bg-[rgba(var(--fg),.2)]">
                  <i className={cn('ph-light text-[16px]', b.icon)} />
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={cn(pill, 'bg-(--ink) text-(--paper)')}
            onClick={() => {
              const r = [...dRows]
              r.splice(rSel + 1, 0, { k: 'acc', t: t({ id: 'Baris baru', en: 'New row' }) })
              setRows(r)
              setRSel(rSel + 1)
            }}
          >
            <i className="ph-light ph-plus text-[15px]" />
            {t(M.rAdd)}
          </button>
          <button
            type="button"
            disabled={!sel}
            className={cn(pill, 'bg-[rgba(var(--fg),.1)] disabled:opacity-40')}
            onClick={() => {
              setRows(dRows.filter((_, i) => i !== rSel))
              setRSel(Math.max(0, rSel - 1))
            }}
          >
            <i className="ph-light ph-minus text-[15px]" />
            {t(M.rDel)}
          </button>
          {d.rows && (
            <button type="button" className="ml-auto flex cursor-pointer items-center gap-1.5 text-[12.5px] opacity-75 hover:opacity-100" onClick={() => set({ rows: null })}>
              <i className="ph-light ph-arrow-counter-clockwise text-[14px]" />
              {t(M.rReset)}
            </button>
          )}
        </div>
        <span className="text-[11.5px] leading-[1.45] opacity-55">{t(M.rNote)}</span>
      </div>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent showCloseButton={false} className={cn(modal, 'flex h-[min(720px,calc(100%-32px))] w-[min(980px,calc(100%-32px))] flex-col gap-0', isMobile ? 'p-5' : 'p-7')} data-screen-label="Edit report layout">
        <div className="flex flex-none items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[.5px] opacity-60">{t(M.kicker)}</div>
            <DialogTitle className="mt-1.5 text-[22px] font-light leading-[1.2]">{name}</DialogTitle>
          </div>
          <button type="button" aria-label="×" className={xBtn} onClick={onClose}>
            ×
          </button>
        </div>
        <div className="no-scrollbar mt-[18px] box-border flex max-w-full flex-none gap-1 self-start overflow-x-auto rounded-[20px] bg-[rgba(var(--fg),.08)] p-1">
          {M.tabs.map((x, i) => (
            <button key={x.id} type="button" onClick={() => setTab(i)} className={cn('flex-none cursor-pointer whitespace-nowrap rounded-[16px] px-3.5 py-2 text-[12px]', tab === i && 'bg-(--ink) text-(--paper)')}>
              {t(x)}
            </button>
          ))}
        </div>
        <div className="mt-[22px] min-h-0 flex-1 overflow-y-auto p-0.5">{[colTab, fltTab, hfTab, pgTab, fontTab, numTab, rowTab][tab]}</div>
        <div className="mt-[18px] flex flex-none flex-wrap items-center gap-2 border-t border-[rgba(var(--fg),.1)] pt-4">
          <button type="button" className="flex cursor-pointer items-center gap-1.5 text-[12.5px] opacity-70 hover:opacity-100" onClick={() => setD({ ...layoutDefault, cols: null })}>
            <i className="ph-light ph-arrow-counter-clockwise text-[14px]" />
            {t(M.resetAll)}
          </button>
          <button type="button" className="ml-auto cursor-pointer rounded-[20px] bg-[rgba(var(--fg),.1)] px-[18px] py-3 text-[13px]" onClick={onClose}>
            {t({ id: 'Batal', en: 'Cancel' })}
          </button>
          <button
            type="button"
            disabled={save.isPending}
            className="cursor-pointer rounded-[20px] bg-(--ink) px-[22px] py-3 text-[13px] text-(--paper) disabled:opacity-60"
            onClick={() =>
              save.mutate(d, {
                onSuccess: () => {
                  showToast(t(M.saved))
                  onClose()
                },
              })
            }
          >
            {t({ id: 'Simpan', en: 'Save' })}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
