import { sql } from 'drizzle-orm'
import type { Db } from '../db'
import { formatEn } from './dimensions'
import { fmtDate } from './general-ledger'

// Pekerjaan Pesanan reports (ADR-0026); rules in docs/reports/JobCosting*.md and FinishedJobCostByMonth.md.
// Retail Demo prints en-US numbers. Functions return the report body: title lines and per-page footers are page furniture.

export interface JobLine { kind: 'ITEM' | 'EXPENSE'; code: string; name: string; unit: string; qty: number; amount: number }
export interface Job {
  number: string; date: string; description: string; total: number; lines: JobLine[]
  rollOver?: { number: string; date: string; lines: { item: string; name: string; unit: string; qty: number; portion: number; amount: number }[] }
  journal: { account: string; name: string; debit: number; credit: number }[]
}

export async function loadJobs(db: Db): Promise<Job[]> {
  const ls = await db.execute(sql`SELECT l.job_number, COALESCE(l.item_no, l.account_no) AS code, l.item_no, l.name, i.unit, l.quantity, l.amount
    FROM job_order_lines l LEFT JOIN items i ON i.no = l.item_no ORDER BY l.job_number, l.seq`)
  const ros = await db.execute(sql`SELECT r.number, r.job_number, to_char(r.date,'YYYY-MM-DD') AS date, l.item_no, i.name, i.unit, l.quantity, l.portion, l.amount
    FROM roll_overs r JOIN roll_over_lines l ON l.roll_over_number = r.number JOIN items i ON i.no = l.item_no ORDER BY r.number, l.seq`)
  const js = await db.execute(sql`SELECT j.number, l.account_no, a.name, l.debit, l.credit FROM job_orders j JOIN journal_lines l USING (journal_id)
    JOIN accounts a ON a.no = l.account_no ORDER BY j.number, l.line_no`)
  return (await db.execute(sql`SELECT number, to_char(date,'YYYY-MM-DD') AS date, description, total FROM job_orders ORDER BY number`)).map(j => {
    const ro = ros.filter(r => r.job_number === j.number)
    return {
      number: j.number as string, date: j.date as string, description: j.description as string, total: Number(j.total),
      lines: ls.filter(l => l.job_number === j.number).map(l => ({ kind: l.item_no ? 'ITEM' as const : 'EXPENSE' as const, code: l.code as string, name: l.name as string,
        unit: (l.unit as string | null) ?? '', qty: Number(l.quantity), amount: Number(l.amount) })),
      rollOver: ro.length ? { number: ro[0]!.number as string, date: ro[0]!.date as string,
        lines: ro.map(r => ({ item: r.item_no as string, name: r.name as string, unit: r.unit as string, qty: Number(r.quantity), portion: Number(r.portion), amount: Number(r.amount) })) } : undefined,
      journal: js.filter(l => l.number === j.number).map(l => ({ account: l.account_no as string, name: l.name as string, debit: Number(l.debit), credit: Number(l.credit) })),
    }
  })
}

const qtyEn = (q: number) => q.toLocaleString('en-US', { maximumFractionDigits: 2 })
const monthOf = (iso: string) => iso.slice(0, 7)
const monthLabel = (ym: string) => fmtDate(`${ym}-01`).slice(3)

/** Crosstab: one row per name, Kuantitas | amount per month (oldest first) and Total Bulan, then a total row. */
function crosstab(facts: { date: string; name: string; qty: number; amount: number }[], first: string, amountLabel: string, totalLabel: string): string[][] {
  const ms = [...new Set(facts.map(f => monthOf(f.date)))].sort() // shortcut: months without data are left out (not captured)
  const cells = (fs: typeof facts) => [...ms.map(m => fs.filter(f => monthOf(f.date) === m)), fs]
    .flatMap(xs => [qtyEn(xs.reduce((s, f) => s + f.qty, 0)), formatEn(xs.reduce((s, f) => s + f.amount, 0))])
  const names = [...new Set(facts.map(f => f.name))].sort((a, b) => a.localeCompare(b))
  return [[first, ...ms.map(monthLabel), 'Total Bulan'], ms.concat('').flatMap(() => ['Kuantitas', amountLabel]),
    ...names.map(n => [n, ...cells(facts.filter(f => f.name === n))]), [totalLabel, ...cells(facts)]]
}

/** Bahan dan Biaya Pekerjaan per Bulan: materials (by item name) and expenses (by expense name, quantity 1) of job orders dated in range. */
export function jobCostingByMonth(jobs: Job[], from: string, to: string): string[][] {
  const facts = jobs.filter(j => j.date >= from && j.date <= to).flatMap(j => j.lines.map(l => ({ date: j.date, name: l.name, qty: l.qty, amount: l.amount })))
  return crosstab(facts, 'Bahan dan Biaya', 'Biaya', 'Total Bahan dan Biaya')
}

/** Penyelesaian Barang/Biaya per Bulan: finished items of roll-overs dated in range, at their allocated value. */
export function finishedJobCostByMonth(jobs: Job[], from: string, to: string): string[][] {
  const facts = jobs.flatMap(j => j.rollOver && j.rollOver.date >= from && j.rollOver.date <= to ? j.rollOver.lines.map(l => ({ date: j.rollOver!.date, name: l.name, qty: l.qty, amount: l.amount })) : [])
  return crosstab(facts, 'Keterangan', 'Nilai Total', 'Total Keterangan')
}

/** Histori Pekerjaan Pesanan: one block (one page) per job order dated in range; expense lines, then materials, then the finished items. */
export function jobCostingHistory(jobs: Job[], from: string, to: string): string[][] {
  return jobs.filter(j => j.date >= from && j.date <= to).flatMap(j => {
    const d = fmtDate(j.date), ro = j.rollOver
    return [
      ['Batch No.', ':', j.number, 'Status', ':', ro ? 'Selesai' : 'Sedang diproses'],
      ['Tanggal Pekerjaan', ':', d, 'Keterangan', ':', j.description].filter(c => c !== ''),
      ['Tanggal Selesai', ':', ro ? fmtDate(ro.date) : '', 'Total Pesanan', ':', formatEn(j.total)].filter(c => c !== ''),
      ['Tanggal', 'Kode', 'Bahan dan Biaya', 'Kuantitas', 'Unit', 'Alokasi (%)', 'Biaya', 'Tipe Transaksi'],
      // shortcut: Accurate's order among material lines is not stable (NL-RG-JC1 prints seq 2,1; JC2 seq 1,2); seq order here
      ...[...j.lines.filter(l => l.kind === 'EXPENSE'), ...j.lines.filter(l => l.kind === 'ITEM')]
        .map(l => [d, l.code, l.name, qtyEn(l.qty), l.unit, formatEn(l.amount), 'Pengeluaran Barang'].filter(c => c !== '')),
      ...(ro?.lines ?? []).map(l => [fmtDate(ro!.date), l.item, l.name, qtyEn(l.qty), l.unit, qtyEn(l.portion), formatEn(l.amount), 'Penyelesaian Pesanan']),
    ]
  })
}

/** Rincian Jurnal Pekerjaan Pesanan: every job order's journal (no date parameter), lines in posting order, then the debit/credit totals twice. */
export function jobCostingJournalDetail(jobs: Job[]): string[][] {
  return jobs.flatMap(j => {
    const dr = j.journal.reduce((s, l) => s + l.debit, 0), cr = j.journal.reduce((s, l) => s + l.credit, 0)
    return [
      ['Tanggal', ':', fmtDate(j.date), 'Keterangan', ':', j.description].filter(c => c !== ''),
      ['Nomor #', ':', j.number],
      ['Kode Perkiraan', 'Nama', 'Debit', 'Kredit', 'Keterangan'],
      [`Pekerjaan Pesanan ${j.number}`],
      ...j.journal.map(l => [l.account, l.name, formatEn(l.debit), formatEn(l.credit), j.description].filter(c => c !== '')),
      [formatEn(dr), formatEn(cr)], [formatEn(dr), formatEn(cr)],
    ]
  })
}
