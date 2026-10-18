import { sql } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../db'
import { DomainError } from '../ledger/deciders'
import { handleTx } from '../ledger/handler'
import { merge, nextNumber, period } from '../sales/service'
import { addMove, fifoCost, layers, loadMoves } from './fifo'

// Pekerjaan Pesanan (ADR-0026; fixtures/retail/jobcosting-rg.json). Accurate's journals:
// job order JC.yyyy.mm.nnnnn  Dr WIP (job total) / Cr inventory per account (FIFO cost) / Cr expense accounts;
// Penyelesaian Pesanan RO.yyyy.mm.nnnnn  Dr finished item's inventory account (job total x portion) / Cr WIP; the job is then "Selesai".
const rp = (c: number) => (c / 100).toFixed(2)

const jobInput = z.object({
  idempotencyKey: z.string().min(8), number: z.string().optional(), date: z.string(), description: z.string().default(''), wipAccount: z.string(),
  materials: z.array(z.object({ item: z.string(), qty: z.number().positive() })).default([]),
  expenses: z.array(z.object({ account: z.string(), name: z.string(), amount: z.number().positive() })).default([]),
}).refine(j => j.materials.length + j.expenses.length > 0, 'Pekerjaan pesanan butuh bahan atau biaya')

export async function createJobOrder(db: Db, raw: z.input<typeof jobInput>) {
  const j = jobInput.parse(raw)
  return db.transaction(async tx => {
    const [done] = await tx.execute(sql`SELECT result FROM command_results WHERE idempotency_key = ${j.idempotencyKey}`)
    if (done) return done.result as { number: string }
    const number = j.number ?? await nextNumber(tx, `JC.${period(j.date)}`)
    const mats: { item: string; name: string; qty: number; cost: number; inv: string }[] = []
    for (const m of j.materials) {
      const [it] = await tx.execute(sql`SELECT name, inventory_account FROM items WHERE no = ${m.item} AND type = 'INVENTORY'`)
      if (!it) throw new DomainError(`Barang persediaan ${m.item} tidak ditemukan`)
      mats.push({ item: m.item, name: it.name as string, qty: m.qty, cost: fifoCost(layers(await loadMoves(tx, m.item, j.date)), m.qty), inv: it.inventory_account as string })
    }
    const exps = j.expenses.map(e => ({ ...e, amount: Math.round(e.amount * 100) }))
    const total = mats.reduce((s, m) => s + m.cost, 0) + exps.reduce((s, e) => s + e.amount, 0)
    const journalId = crypto.randomUUID()
    await handleTx(tx, {
      type: 'PostJournal', idempotencyKey: `${j.idempotencyKey}:journal`, journalId, number, sourceType: 'JC', date: j.date, description: j.description,
      lines: [{ account: j.wipAccount, side: 'DEBIT' as const, amount: rp(total) },
        ...merge([...mats.map(m => ({ account: m.inv, amount: m.cost })), ...exps]).map(l => ({ account: l.account, side: 'CREDIT' as const, amount: rp(l.amount) }))],
    })
    await tx.execute(sql`INSERT INTO job_orders VALUES (${number}, ${j.date}, ${j.description}, ${j.wipAccount}, ${total}, ${journalId})`)
    let seq = 0
    for (const m of mats) {
      await tx.execute(sql`INSERT INTO job_order_lines VALUES (${number}, ${++seq}, ${m.item}, NULL, ${m.name}, ${m.qty}, ${m.cost})`)
      await addMove(tx, { item: m.item, date: j.date, docType: 'JC', docNumber: number, description: j.description, quantity: -m.qty, value: -m.cost })
    }
    for (const e of exps) await tx.execute(sql`INSERT INTO job_order_lines VALUES (${number}, ${++seq}, NULL, ${e.account}, ${e.name}, 1, ${e.amount})`)
    const result = { number }
    await tx.execute(sql`INSERT INTO command_results (idempotency_key, command_type, result) VALUES (${j.idempotencyKey}, 'CreateJobOrder', ${JSON.stringify(result)}::jsonb)`)
    return result
  })
}

const rollInput = z.object({
  idempotencyKey: z.string().min(8), number: z.string().optional(), job: z.string(), date: z.string(), description: z.string().default(''),
  lines: z.array(z.object({ item: z.string(), qty: z.number().positive(), portion: z.number().positive().max(100) })).min(1),
}).refine(r => Math.abs(r.lines.reduce((s, l) => s + l.portion, 0) - 100) < 1e-9, 'Alokasi harus berjumlah 100%')

export async function createRollOver(db: Db, raw: z.input<typeof rollInput>) {
  const r = rollInput.parse(raw)
  return db.transaction(async tx => {
    const [done] = await tx.execute(sql`SELECT result FROM command_results WHERE idempotency_key = ${r.idempotencyKey}`)
    if (done) return done.result as { number: string }
    const [job] = await tx.execute(sql`SELECT j.total, j.wip_account, to_char(j.date,'YYYY-MM-DD') AS date, ro.number AS ro FROM job_orders j LEFT JOIN roll_overs ro ON ro.job_number = j.number WHERE j.number = ${r.job}`)
    if (!job) throw new DomainError(`Pekerjaan pesanan ${r.job} tidak ditemukan`)
    if (job.ro) throw new DomainError(`Pekerjaan pesanan ${r.job} sudah selesai (${job.ro})`)
    if (r.date < (job.date as string)) throw new DomainError('Tanggal penyelesaian sebelum tanggal pekerjaan')
    const total = Number(job.total)
    const outs: { item: string; qty: number; portion: number; amount: number; inv: string }[] = []
    for (const [i, l] of r.lines.entries()) {
      const [it] = await tx.execute(sql`SELECT inventory_account FROM items WHERE no = ${l.item} AND type = 'INVENTORY'`)
      if (!it) throw new DomainError(`Barang persediaan ${l.item} tidak ditemukan`)
      // the last line takes the rounding remainder so WIP clears exactly
      const amount = i === r.lines.length - 1 ? total - outs.reduce((s, o) => s + o.amount, 0) : Math.round(total * l.portion / 100)
      outs.push({ ...l, amount, inv: it.inventory_account as string })
    }
    const number = r.number ?? await nextNumber(tx, `RO.${period(r.date)}`)
    const journalId = crypto.randomUUID()
    await handleTx(tx, {
      type: 'PostJournal', idempotencyKey: `${r.idempotencyKey}:journal`, journalId, number, sourceType: 'RO', date: r.date, description: r.description,
      lines: [...merge(outs.map(o => ({ account: o.inv, amount: o.amount }))).map(l => ({ account: l.account, side: 'DEBIT' as const, amount: rp(l.amount) })),
        { account: job.wip_account as string, side: 'CREDIT' as const, amount: rp(total) }],
    })
    await tx.execute(sql`INSERT INTO roll_overs VALUES (${number}, ${r.job}, ${r.date}, ${r.description}, ${journalId})`)
    for (const [i, o] of outs.entries()) {
      await tx.execute(sql`INSERT INTO roll_over_lines VALUES (${number}, ${i + 1}, ${o.item}, ${o.qty}, ${o.portion}, ${o.amount})`)
      await addMove(tx, { item: o.item, date: r.date, docType: 'RO', docNumber: number, description: r.description, quantity: o.qty, value: o.amount })
    }
    const result = { number }
    await tx.execute(sql`INSERT INTO command_results (idempotency_key, command_type, result) VALUES (${r.idempotencyKey}, 'CreateRollOver', ${JSON.stringify(result)}::jsonb)`)
    return result
  })
}
