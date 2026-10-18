import { sql } from 'drizzle-orm'
import type { Db } from '../db'
import { fmtDate } from './general-ledger'
import { formatIdr } from './trial-balance'

// Pajak reports over invoice tax lines; rules in docs/reports/TaxationOutReport.md (fixture: fixtures/tax-t19.json).

export interface TaxLine { number: string; date: string; taxDate: string; taxNumber: string; tax: string; rate: number; amount: number }

export async function loadSalesTaxes(db: Db): Promise<TaxLine[]> {
  return (await db.execute(sql`SELECT i.number, to_char(i.date,'YYYY-MM-DD') AS date, to_char(COALESCE(i.tax_date, i.date),'YYYY-MM-DD') AS tax_date,
      COALESCE(i.tax_number, '') AS tax_number, t.tax_name, t.rate, t.amount
    FROM sales_invoice_taxes t JOIN sales_invoices i ON i.number = t.invoice_number`))
    .map(r => ({ number: r.number as string, date: r.date as string, taxDate: r.tax_date as string, taxNumber: r.tax_number as string, tax: r.tax_name as string, rate: Number(r.rate), amount: Number(r.amount) }))
}

/** Daftar PPN/PPnBM Keluaran: Saldo Awal = all output tax dated before `from`; then one block per tax (name order) of in-range invoices by tax date, number. */
export function taxationOut(lines: TaxLine[], from: string, to: string): string[][] {
  const opening = lines.filter(l => l.taxDate < from).reduce((s, l) => s + l.amount, 0)
  const inRange = lines.filter(l => l.taxDate >= from && l.taxDate <= to).sort((a, b) => (a.taxDate + a.number < b.taxDate + b.number ? -1 : 1))
  const rows: string[][] = [['Daftar PPN/PPnBM Keluaran'], [`Dari ${fmtDate(from)} s/d ${fmtDate(to)}`], ['Tanggal', 'Tgl Pajak', 'No Referensi', 'No. Faktur Pajak', 'Nilai Pajak'],
    ['PPN Keluaran'], ['Saldo Awal'], ['-', '-', formatIdr(opening)], [formatIdr(opening)]]
  let total = opening
  for (const tax of [...new Set(inRange.map(l => l.tax))].sort()) {
    const block = inRange.filter(l => l.tax === tax)
    rows.push([`${tax} (${block[0]!.rate}%)`])
    for (const l of block) rows.push([fmtDate(l.date), fmtDate(l.taxDate), l.number, l.taxNumber, formatIdr(l.amount)].filter(c => c !== ''))
    const sum = block.reduce((s, l) => s + l.amount, 0)
    rows.push([formatIdr(sum)])
    total += sum
  }
  rows.push(['Total dari PPN Keluaran', formatIdr(total)])
  return rows
}

/** Faktur Penjualan SPT Masa PPN: only invoices carrying an e-Faktur number (No. Faktur Pajak); none in the fixture. */
export function salesInvoiceSpt(lines: TaxLine[], from: string, to: string): string[][] {
  const rows: string[][] = [['Faktur Penjualan SPT Masa PPN'], [`Dari ${fmtDate(from)} s/d ${fmtDate(to)}`], ['Nomor #', 'Tanggal', 'No. Faktur Pajak', 'Tgl Faktur Pajak', 'Pelanggan', 'Nilai Pajak']]
  if (lines.some(l => l.taxNumber && l.taxDate >= from && l.taxDate <= to)) throw new Error('SalesInvoiceSPTListReport rows with a tax number are not reverse-engineered yet')
  return rows
}
