import { sql } from 'drizzle-orm'
import type { Db } from '../db'
import { fmtDate } from './general-ledger'
import { formatIdr } from './trial-balance'

// PPh withholding reports (P3.5), verified on Manufaktur Demo (fixtures/pph-m50.json): one row per receipt/payment line
// that withheld PPh, grouped by PPh type and then party.
export interface PphLine { side: 'SALES' | 'PURCHASE'; date: string; type: string; party: string; doc: string; invoice: string; bill: string; slip: string; dpp: number; rate: number; amount: number }

export async function loadPphLines(db: Db): Promise<PphLine[]> {
  return (await db.execute(sql`
    SELECT 'SALES' AS side, to_char(r.date,'YYYY-MM-DD') AS date, t.pph_type, c.name AS party, r.number AS doc, l.invoice_number AS invoice, '' AS bill, l.pph_number, l.pph_dpp, l.pph_rate, l.pph_amount
      FROM sales_receipt_lines l JOIN sales_receipts r ON r.number = l.receipt_number JOIN customers c ON c.no = r.customer_no JOIN taxes t ON t.name = l.pph_tax
    UNION ALL
    SELECT 'PURCHASE', to_char(p.date,'YYYY-MM-DD'), t.pph_type, v.name, p.number, l.invoice_number, i.bill_number, l.pph_number, l.pph_dpp, l.pph_rate, l.pph_amount
      FROM purchase_payment_lines l JOIN purchase_payments p ON p.number = l.payment_number JOIN vendors v ON v.no = p.vendor_no
      JOIN purchase_invoices i ON i.number = l.invoice_number JOIN taxes t ON t.name = l.pph_tax
    ORDER BY 3, 4, 2, 5`)).map(r => ({ side: r.side as PphLine['side'], date: r.date as string, type: r.pph_type as string, party: r.party as string, doc: r.doc as string,
    invoice: r.invoice as string, bill: r.bill as string, slip: r.pph_number as string, dpp: Number(r.pph_dpp), rate: Number(r.pph_rate), amount: Number(r.pph_amount) }))
}

const sum = (ls: PphLine[], k: 'dpp' | 'amount') => ls.reduce((s, l) => s + l[k], 0)
function grouped(ls: PphLine[], row: (l: PphLine) => string[], partyTotal: (g: PphLine[]) => string[], typeTotal?: (g: PphLine[]) => string[]) {
  const out: string[][] = []
  for (const type of [...new Set(ls.map(l => l.type))]) {
    const t = ls.filter(l => l.type === type)
    out.push([type])
    for (const party of [...new Set(t.map(l => l.party))]) {
      const g = t.filter(l => l.party === party)
      out.push([party], ...g.map(row), partyTotal(g))
    }
    if (typeTotal) out.push(typeTotal(t))
  }
  return out
}
const inRange = (ls: PphLine[], side: PphLine['side'], from: string, to: string) => ls.filter(l => l.side === side && l.date >= from && l.date <= to)
const slipRow = (inv: (l: PphLine) => string) => (l: PphLine) => [fmtDate(l.date), l.slip, inv(l), formatIdr(l.dpp), `${String(l.rate).replace('.', ',')} %`, formatIdr(l.amount)]
const dppAmt = (g: PphLine[]) => [formatIdr(sum(g, 'dpp')), formatIdr(sum(g, 'amount'))]

/** Daftar Bukti Potong PPh Penjualan (SalesReceiptPPhReport): slips received on sales receipts, invoice = No. Faktur Penjualan. */
export const salesReceiptPph = (ls: PphLine[], from: string, to: string) =>
  [['Tanggal', 'No. Bukti Potong', 'Nomor # Faktur Penjualan', 'Pembayaran', 'Tarif PPh', 'Nilai PPh'], ...grouped(inRange(ls, 'SALES', from, to), slipRow(l => l.invoice), dppAmt, dppAmt)]

/** Daftar Bukti Potong PPh Pembelian (PurchasePaymentPPhReport): slips issued on purchase payments, invoice = the vendor's No. Faktur. */
export const purchasePaymentPph = (ls: PphLine[], from: string, to: string) =>
  [['Tanggal', 'No. Bukti Potong', 'No Faktur # Faktur Pembelian', 'Total Kena Pajak', 'Tarif PPh', 'Nilai PPh'], ...grouped(inRange(ls, 'PURCHASE', from, to), slipRow(l => l.bill), dppAmt, dppAmt)]

/** Pembayaran PPh Pembelian (PurchaseInvoicePphPaidReport): PPh withheld per invoice and payment form. Bayar PPh is always 0:
 * depositing the PPh to the tax office (NTPN) is not modelled. */
export const purchaseInvoicePphPaid = (ls: PphLine[], from: string, to: string) =>
  [['Faktur Pembelian', 'No. Form', 'PPh', 'Bayar PPh', 'NTPN', 'Tgl Bayar PPh'],
    ...grouped(inRange(ls, 'PURCHASE', from, to), l => [l.invoice, l.doc, formatIdr(l.amount), '0'], g => [formatIdr(sum(g, 'amount')), '0'])]
