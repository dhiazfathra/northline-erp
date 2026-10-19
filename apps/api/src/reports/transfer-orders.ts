import { sql } from 'drizzle-orm'
import type { Db } from '../db'
import { formatIdr } from './trial-balance'
import { fmtDate } from './general-ledger'

// Daftar Perintah Pembayaran (TransferOrderListReport), verified on Manufaktur Demo (fixtures/transfer-orders-m49.json).
const METHOD = { BANK_TRANSFER: 'Transfer Bank', VIRTUAL_ACCOUNT: 'Virtual Account', CHEQUE: 'Cek/Giro' } as Record<string, string>
const STATUS = { DRAFT: 'Draf', UNAPPROVED: 'Diajukan', REJECTED: 'Ditolak', WAITING: 'Menunggu Ditransfer', PARTIAL_TRANSFERRED: 'Sebagian Ditransfer', FULLY_TRANSFERRED: 'Ditransfer Seluruhnya', FAILED: 'Gagal Ditransfer' } as Record<string, string>

export interface TransferOrder { number: string; date: string; bank: string; method: string; status: string; paid: number }

export async function loadTransferOrders(db: Db): Promise<TransferOrder[]> {
  return (await db.execute(sql`SELECT o.number, to_char(o.date,'YYYY-MM-DD') AS date, a.name AS bank, o.payment_method, o.status, SUM(l.amount) AS paid
    FROM transfer_orders o JOIN accounts a ON a.no = o.bank_no JOIN transfer_order_lines l ON l.order_number = o.number
    GROUP BY o.number, a.name ORDER BY o.date, o.number`)).map(r => ({ number: r.number as string, date: r.date as string, bank: r.bank as string,
    method: METHOD[r.payment_method as string]!, status: STATUS[r.status as string]!, paid: Number(r.paid) }))
}

/** One row per payment order dated in range; Faktur Dibayar is the sum of its invoice payments. */
export function transferOrderList(orders: TransferOrder[], from: string, to: string): string[][] {
  return [['Nomor #', 'Tanggal', 'Bank', 'Metode Bayar', 'Status', 'Faktur Dibayar'],
    ...orders.filter(o => o.date >= from && o.date <= to).map(o => [o.number, fmtDate(o.date), o.bank, o.method, o.status, formatIdr(o.paid)])]
}
