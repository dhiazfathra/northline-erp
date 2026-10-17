import type { ReportRow } from '@northline/schemas/reports'
import type { CSSProperties } from 'react'

export type ColId = 'code' | 'cur' | 'prev' | 'diff' | 'pct'
export const colDefs: Record<ColId, { id: string; en: string }> = {
  code: { id: 'Kode Akun', en: 'Account Code' },
  cur: { id: 'Saldo', en: 'Balance' },
  prev: { id: 'Periode Sebelumnya', en: 'Prior Period' },
  diff: { id: 'Selisih', en: 'Variance' },
  pct: { id: 'Perubahan %', en: 'Change %' },
}

export type FontKey = 'co' | 'ti' | 'fil' | 'col' | 'sec' | 'grp' | 'acc' | 'sub' | 'tot' | 'add' | 'pd' | 'pn'
export interface FontStyle { ff: string; sz: number; b: boolean; i: boolean; u: boolean; c: string; ta: 'left' | 'center' | 'right'; wrap: boolean }
const f = (sz: number, c = '#18181b', b = false, ta: FontStyle['ta'] = 'left'): FontStyle => ({ ff: 'Outfit', sz, b, i: false, u: false, c, ta, wrap: false })
export const fontDefaults: Record<FontKey, FontStyle> = {
  co: f(13, '#18181b', true),
  ti: f(28, '#18181b', true),
  fil: f(12),
  col: f(9.5, '#71717a'),
  sec: f(11, '#4338ca', true),
  grp: f(12.5, '#18181b', true),
  acc: f(12.5, '#3f3f46'),
  sub: f(12.5, '#18181b', true),
  tot: f(13, '#18181b', true),
  add: f(11.5, '#52525b'),
  pd: f(10.5, '#71717a'),
  pn: f(10.5, '#71717a', false, 'right'),
}
export const fontLabels: Record<FontKey, { id: string; en: string }> = {
  co: { id: 'Nama perusahaan', en: 'Company name' },
  ti: { id: 'Judul laporan', en: 'Report title' },
  fil: { id: 'Info filter', en: 'Filter info' },
  col: { id: 'Judul kolom', en: 'Column titles' },
  sec: { id: 'Baris bagian', en: 'Section rows' },
  grp: { id: 'Baris grup', en: 'Group rows' },
  acc: { id: 'Baris akun', en: 'Account rows' },
  sub: { id: 'Baris subtotal', en: 'Subtotal rows' },
  tot: { id: 'Baris total', en: 'Total rows' },
  add: { id: 'Teks tambahan', en: 'Additional text' },
  pd: { id: 'Tanggal cetak', en: 'Printed date' },
  pn: { id: 'Nomor halaman', en: 'Page number' },
}
export const fontCss = (s: FontStyle): CSSProperties => ({
  fontFamily: `${s.ff},sans-serif`,
  fontSize: s.sz,
  fontWeight: s.b ? 600 : 400,
  fontStyle: s.i ? 'italic' : 'normal',
  textDecoration: s.u ? 'underline' : 'none',
  color: s.c,
  textAlign: s.ta,
})

export type ShowKey = 'head' | 'co' | 'sub' | 'ti' | 'fil' | 'colT' | 'foot' | 'pd' | 'sys' | 'pn' | 'add'
export interface Filter { f: string; op: string; v: string }
export interface NumFmt { df: string; dec: 'id' | 'en' | 'sp'; neg: 'minus' | 'paren' | 'trail'; red: boolean; dp: number }
export interface Layout {
  show: Record<ShowKey, boolean>
  text: { ti: string; sys: string; add: string }
  /** null = derived from the report parameters. */
  cols: { id: ColId; name: string; on: boolean }[] | null
  flt: Filter[]
  page: { size: string; ori: 'p' | 'l'; flex: boolean; mar: { t: number; b: number; l: number; r: number } }
  fonts: Record<FontKey, FontStyle>
  num: NumFmt
  rows: ReportRow[] | null
}
export const layoutDefault: Layout = {
  show: { head: true, co: true, sub: true, ti: true, fil: true, colT: true, foot: true, pd: true, sys: true, pn: true, add: false },
  text: { ti: '', sys: 'Northline ERP', add: '' },
  cols: null,
  flt: [],
  page: { size: 'A4', ori: 'p', flex: false, mar: { t: 14, b: 8, l: 15, r: 15 } },
  fonts: fontDefaults,
  num: { df: 'dd/mm/yyyy', dec: 'en', neg: 'minus', red: true, dp: 0 },
  rows: null,
}

export const paperMm: Record<string, [number, number]> = { A4: [210, 297], Letter: [216, 279], Legal: [216, 356], F4: [215, 330] }

export function fmtNum(n: number, f: NumFmt) {
  const [i, d] = Math.abs(n).toFixed(f.dp).split('.')
  const [ts, ds] = f.dec === 'id' ? ['.', ','] : f.dec === 'en' ? [',', '.'] : [' ', ',']
  const s = i.replace(/\B(?=(\d{3})+(?!\d))/g, ts) + (d ? ds + d : '')
  if (n >= 0) return s
  return f.neg === 'paren' ? `(${s})` : f.neg === 'trail' ? `${s}-` : `-${s}`
}

const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
export function fmtDate(iso: string, df: string) {
  const [y, m, d] = iso.split('-')
  if (df === 'yyyy-mm-dd') return iso
  if (df === 'dd mmm yyyy') return `${d} ${mon[+m - 1]} ${y}`
  return `${d}/${m}/${y}`
}

/** Applies layout filters to account rows; other rows pass through. */
export function applyFilters(rows: ReportRow[], flt: Filter[]) {
  return rows.filter((r) =>
    r.k !== 'acc' ||
    flt.every(({ f, op, v }) => {
      const x = f === 'Nilai' ? (r.cur ?? 0) : f === 'Kode Akun' ? (r.code ?? '') : r.t
      const s = String(x).toLowerCase()
      if (op === 'kosong') return !s
      if (op === 'tidak kosong') return !!s
      if (op === 'lebih dari') return Number(x) > Number(v)
      if (op === 'kurang dari') return Number(x) < Number(v)
      if (op === 'sama dengan') return s === v.toLowerCase()
      return s.includes(v.toLowerCase())
    }),
  )
}
