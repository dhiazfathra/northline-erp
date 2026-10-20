import { sql } from 'drizzle-orm'
import { z } from 'zod'
import type { Db, Tx } from '../db'
import { DomainError } from '../ledger/deciders'
import { handleTx } from '../ledger/handler'
import { merge, nextNumber, period } from '../sales/service'
import { addMove, costingMethod, costOut, layers, loadMoves } from './fifo'

// Pekerjaan Pesanan (ADR-0026; fixtures/retail/jobcosting-rg.json). Accurate's journals:
// job order JC.yyyy.mm.nnnnn  Dr WIP (job total) / Cr inventory per account (FIFO cost) / Cr expense accounts;
// Penyelesaian Pesanan RO.yyyy.mm.nnnnn  Dr finished item's inventory account (job total x portion) / Cr WIP; the job is then "Selesai".
const rp = (c: number) => (c / 100).toFixed(2)

const jobInput = z.object({
  idempotencyKey: z.string().min(8), number: z.string().optional(), date: z.string(), description: z.string().default(''), wipAccount: z.string(), customer: z.string().optional(),
  materials: z.array(z.object({ item: z.string(), qty: z.number().positive() })).default([]),
  expenses: z.array(z.object({ account: z.string(), name: z.string(), amount: z.number().positive() })).default([]),
}).refine(j => j.materials.length + j.expenses.length > 0, 'Detail dari transaksi belum diisi!') // Accurate's text

export async function createJobOrder(db: Db | Tx, raw: z.input<typeof jobInput>) {
  const j = jobInput.parse(raw)
  return db.transaction(async tx => {
    const [done] = await tx.execute(sql`SELECT result FROM command_results WHERE idempotency_key = ${j.idempotencyKey}`)
    if (done) return done.result as { number: string }
    const number = j.number ?? await nextNumber(tx, `JC.${period(j.date)}`)
    const mats: { item: string; name: string; qty: number; cost: number; exact: number; inv: string }[] = []
    for (const m of j.materials) {
      const [it] = await tx.execute(sql`SELECT name, inventory_account FROM items WHERE no = ${m.item} AND type = 'INVENTORY'`)
      if (!it) throw new DomainError(`Barang persediaan ${m.item} tidak ditemukan`)
      const cm = await costingMethod(tx), exact = costOut(layers(await loadMoves(tx, m.item, j.date), cm), m.qty, cm)
      mats.push({ item: m.item, name: it.name as string, qty: m.qty, cost: Math.round(exact), exact, inv: it.inventory_account as string })
    }
    const exps = j.expenses.map(e => ({ ...e, amount: Math.round(e.amount * 100) }))
    const total = mats.reduce((s, m) => s + m.cost, 0) + exps.reduce((s, e) => s + e.amount, 0)
    const journalId = crypto.randomUUID()
    await handleTx(tx, {
      type: 'PostJournal', idempotencyKey: `${j.idempotencyKey}:journal`, journalId, number, sourceType: 'JC', date: j.date, description: j.description,
      lines: [{ account: j.wipAccount, side: 'DEBIT' as const, amount: rp(total) },
        ...merge([...mats.map(m => ({ account: m.inv, amount: m.cost })), ...exps]).map(l => ({ account: l.account, side: 'CREDIT' as const, amount: rp(l.amount) }))],
    })
    await tx.execute(sql`INSERT INTO job_orders VALUES (${number}, ${j.date}, ${j.description}, ${j.wipAccount}, ${total}, ${journalId}, ${j.customer ?? null})`)
    let seq = 0
    for (const m of mats) {
      await tx.execute(sql`INSERT INTO job_order_lines VALUES (${number}, ${++seq}, ${m.item}, NULL, ${m.name}, ${m.qty}, ${m.cost})`)
      await addMove(tx, { item: m.item, date: j.date, docType: 'JC', docNumber: number, description: j.description, quantity: -m.qty, value: -m.exact })
    }
    for (const e of exps) await tx.execute(sql`INSERT INTO job_order_lines VALUES (${number}, ${++seq}, NULL, ${e.account}, ${e.name}, 1, ${e.amount})`)
    const result = { number }
    await tx.execute(sql`INSERT INTO command_results (idempotency_key, command_type, result) VALUES (${j.idempotencyKey}, 'CreateJobOrder', ${JSON.stringify(result)}::jsonb)`)
    return result
  })
}

const rollInput = z.object({
  idempotencyKey: z.string().min(8), number: z.string().optional(), job: z.string(), date: z.string(), description: z.string().default(''),
  lines: z.array(z.object({ item: z.string(), qty: z.number().positive(), portion: z.number().positive().max(100) })).default([]),
  // rollOverType ACCOUNT: the job total goes to accounts (not the job's own expense accounts) instead of finished items
  accounts: z.array(z.object({ account: z.string(), name: z.string(), portion: z.number().positive().max(100) })).default([]),
}).refine(r => (r.lines.length > 0) !== (r.accounts.length > 0), 'Penyelesaian ke barang atau ke akun')
  .refine(r => Math.abs([...r.lines, ...r.accounts].reduce((s, l) => s + l.portion, 0) - 100) < 1e-9, 'Alokasi harus berjumlah 100%')

export async function createRollOver(db: Db | Tx, raw: z.input<typeof rollInput>) {
  const r = rollInput.parse(raw)
  return db.transaction(async tx => {
    const [done] = await tx.execute(sql`SELECT result FROM command_results WHERE idempotency_key = ${r.idempotencyKey}`)
    if (done) return done.result as { number: string }
    const [job] = await tx.execute(sql`SELECT j.total, j.wip_account, to_char(j.date,'YYYY-MM-DD') AS date, ro.number AS ro FROM job_orders j LEFT JOIN roll_overs ro ON ro.job_number = j.number WHERE j.number = ${r.job}`)
    if (!job) throw new DomainError(`Pekerjaan pesanan ${r.job} tidak ditemukan`)
    if (r.date < (job.date as string)) throw new DomainError('Tanggal penyelesaian sebelum tanggal pekerjaan')
    const total = await jobTotal(tx, r.job, Number(job.total))
    const outs: { item: string | null; account: string | null; name: string | null; qty: number; portion: number; amount: number; dr: string }[] = []
    const targets = r.lines.length ? r.lines.map(l => ({ ...l, account: null as string | null, name: null as string | null }))
      : r.accounts.map(a => ({ item: null as string | null, qty: 1, ...a }))
    for (const [i, l] of targets.entries()) {
      let dr: string
      if (l.item) {
        const [it] = await tx.execute(sql`SELECT inventory_account FROM items WHERE no = ${l.item} AND type = 'INVENTORY'`)
        if (!it) throw new DomainError(`Barang persediaan ${l.item} tidak ditemukan`)
        const [mat] = await tx.execute(sql`SELECT name FROM job_order_lines WHERE job_number = ${r.job} AND item_no = ${l.item} LIMIT 1`)
        // Accurate's two texts, as it returns them for a finished item that is one of the job's materials
        if (mat) throw new DomainError(`${mat.name} adalah termasuk dalam bahan baku. Tidak bisa di selesaikan ke barang tersebut.; Penyelesaian ke Barang "${mat.name}" tidak benar. Barang ini merupakan barang yang terdapat pada rincian barang pekerjaan pesanan`)
        dr = it.inventory_account as string
      } else {
        const [own] = await tx.execute(sql`SELECT a.name FROM job_order_lines l JOIN accounts a ON a.no = l.account_no WHERE l.job_number = ${r.job} AND l.account_no = ${l.account}`)
        if (own) throw new DomainError(`Penyelesaian ke Akun "${own.name}" tidak benar. Akun ini merupakan akun rincian biaya pada pekerjaan pesanan`)
        dr = l.account!
      }
      // the last line takes the rounding remainder so WIP clears exactly
      const amount = i === targets.length - 1 ? total - outs.reduce((s, o) => s + o.amount, 0) : Math.round(total * l.portion / 100)
      outs.push({ item: l.item, account: l.account, name: l.name, qty: l.qty, portion: l.portion, amount, dr })
    }
    // after the lines, as Accurate reports a bad finished item before an already-finished job
    if (job.ro) throw new DomainError(`Pekerjaan pesanan ${r.job} sudah selesai (${job.ro})`)
    const number = r.number ?? await nextNumber(tx, `RO.${period(r.date)}`)
    const journalId = crypto.randomUUID()
    await handleTx(tx, {
      type: 'PostJournal', idempotencyKey: `${r.idempotencyKey}:journal`, journalId, number, sourceType: 'RO', date: r.date, description: r.description,
      lines: [...merge(outs.map(o => ({ account: o.dr, amount: o.amount }))).map(l => ({ account: l.account, side: 'DEBIT' as const, amount: rp(l.amount) })),
        { account: job.wip_account as string, side: 'CREDIT' as const, amount: rp(total) }],
    })
    await tx.execute(sql`INSERT INTO roll_overs VALUES (${number}, ${r.job}, ${r.date}, ${r.description}, ${journalId}, ${r.lines.length ? 'ITEM' : 'ACCOUNT'})`)
    for (const [i, o] of outs.entries()) {
      await tx.execute(sql`INSERT INTO roll_over_lines VALUES (${number}, ${i + 1}, ${o.item}, ${o.qty}, ${o.portion}, ${o.amount}, ${o.account}, ${o.name})`)
      if (o.item) await addMove(tx, { item: o.item, date: r.date, docType: 'RO', docNumber: number, description: r.description, quantity: o.qty, value: o.amount })
    }
    const result = { number }
    await tx.execute(sql`INSERT INTO command_results (idempotency_key, command_type, result) VALUES (${r.idempotencyKey}, 'CreateRollOver', ${JSON.stringify(result)}::jsonb)`)
    return result
  })
}

/** Job total with its Penambahan Bahan Baku: picks add their cost, returns take theirs back. */
async function jobTotal(tx: Tx, job: string, base: number) {
  const [a] = await tx.execute(sql`SELECT COALESCE(SUM(CASE m.type WHEN 'ITEM_PICK' THEN l.amount ELSE -l.amount END), 0) AS adj
    FROM material_adjustments m JOIN material_adjustment_lines l ON l.adjustment_number = m.number WHERE m.job_number = ${job}`)
  return base + Number(a!.adj)
}

const adjInput = z.object({
  idempotencyKey: z.string().min(8), number: z.string().optional(), job: z.string(), type: z.enum(['ITEM_PICK', 'ITEM_RETURN']), date: z.string(), description: z.string().default(''),
  lines: z.array(z.object({ item: z.string(), qty: z.number().positive() })).min(1, 'Detail dari transaksi belum diisi!'), // Accurate's text
})

/** Penambahan Bahan Baku (MA): Ambil Barang issues more material into an open job at FIFO cost (Dr WIP / Cr inventory);
 * Retur Barang takes material back at the job's average issued unit cost of that item (Dr inventory / Cr WIP). */
export async function createMaterialAdjustment(db: Db | Tx, raw: z.input<typeof adjInput>) {
  const a = adjInput.parse(raw)
  return db.transaction(async tx => {
    const [done] = await tx.execute(sql`SELECT result FROM command_results WHERE idempotency_key = ${a.idempotencyKey}`)
    if (done) return done.result as { number: string }
    const [job] = await tx.execute(sql`SELECT j.wip_account, to_char(j.date,'YYYY-MM-DD') AS date, ro.number AS ro FROM job_orders j LEFT JOIN roll_overs ro ON ro.job_number = j.number WHERE j.number = ${a.job}`)
    if (!job) throw new DomainError(`Pekerjaan pesanan ${a.job} tidak ditemukan`)
    if (job.ro) throw new DomainError(`Pekerjaan pesanan ${a.job} sudah selesai (${job.ro})`)
    if (a.date < (job.date as string)) throw new DomainError('Tanggal penambahan sebelum tanggal pekerjaan')
    const pick = a.type === 'ITEM_PICK', number = a.number ?? await nextNumber(tx, `MA.${period(a.date)}`)
    const lines: { item: string; qty: number; cost: number; exact: number; inv: string }[] = []
    for (const l of a.lines) {
      const [it] = await tx.execute(sql`SELECT inventory_account FROM items WHERE no = ${l.item} AND type = 'INVENTORY'`)
      if (!it) throw new DomainError(`Barang persediaan ${l.item} tidak ditemukan`)
      let exact: number
      if (pick) { const cm = await costingMethod(tx); exact = costOut(layers(await loadMoves(tx, l.item, a.date), cm), l.qty, cm) } else {
        const [u] = await tx.execute(sql`SELECT SUM(q) AS q, SUM(v) AS v FROM (
            SELECT quantity AS q, amount AS v FROM job_order_lines WHERE job_number = ${a.job} AND item_no = ${l.item}
            UNION ALL SELECT CASE m.type WHEN 'ITEM_PICK' THEN l.quantity ELSE -l.quantity END, CASE m.type WHEN 'ITEM_PICK' THEN l.amount ELSE -l.amount END
            FROM material_adjustments m JOIN material_adjustment_lines l ON l.adjustment_number = m.number WHERE m.job_number = ${a.job} AND l.item_no = ${l.item}) x`)
        if (!(Number(u?.q) >= l.qty)) throw new DomainError(`Barang ${l.item} tidak dipakai sebanyak itu di pekerjaan ${a.job}`)
        exact = l.qty * Number(u!.v) / Number(u!.q)
      }
      lines.push({ item: l.item, qty: l.qty, cost: Math.round(exact), exact, inv: it.inventory_account as string })
    }
    const total = lines.reduce((s, l) => s + l.cost, 0), journalId = crypto.randomUUID()
    const inv = merge(lines.map(l => ({ account: l.inv, amount: l.cost }))).map(l => ({ account: l.account, side: (pick ? 'CREDIT' : 'DEBIT') as 'CREDIT' | 'DEBIT', amount: rp(l.amount) }))
    const wip = { account: job.wip_account as string, side: (pick ? 'DEBIT' : 'CREDIT') as 'CREDIT' | 'DEBIT', amount: rp(total) }
    await handleTx(tx, {
      type: 'PostJournal', idempotencyKey: `${a.idempotencyKey}:journal`, journalId, number, sourceType: 'MA', date: a.date, description: a.description,
      lines: pick ? [wip, ...inv] : [...inv, wip],
    })
    await tx.execute(sql`INSERT INTO material_adjustments VALUES (${number}, ${a.job}, ${a.type}, ${a.date}, ${a.description}, ${journalId})`)
    for (const [i, l] of lines.entries()) {
      await tx.execute(sql`INSERT INTO material_adjustment_lines VALUES (${number}, ${i + 1}, ${l.item}, ${l.qty}, ${l.cost})`)
      await addMove(tx, { item: l.item, date: a.date, docType: 'MA', docNumber: number, description: a.description, quantity: pick ? -l.qty : l.qty, value: pick ? -l.exact : l.exact })
    }
    const result = { number }
    await tx.execute(sql`INSERT INTO command_results (idempotency_key, command_type, result) VALUES (${a.idempotencyKey}, 'CreateMaterialAdjustment', ${JSON.stringify(result)}::jsonb)`)
    return result
  })
}

// Edit in place (same number) and delete, as Accurate does (P4.2 batch 4): the document, its stock moves and its journal are taken back.
type Remove = (tx: Tx, number: string, idempotencyKey: string) => Promise<void>
const unpost = (tx: Tx, idempotencyKey: string, journalId: unknown) => handleTx(tx, { type: 'DeleteJournal', idempotencyKey: `${idempotencyKey}:unpost`, journalId: journalId as string })

const removeJobOrder: Remove = async (tx, number, key) => {
  const [j] = await tx.execute(sql`SELECT journal_id FROM job_orders WHERE number = ${number} FOR UPDATE`)
  if (!j) throw new DomainError(`Pekerjaan pesanan ${number} tidak ditemukan`)
  const [used] = await tx.execute(sql`SELECT 1 FROM roll_overs WHERE job_number = ${number} UNION ALL SELECT 1 FROM material_adjustments WHERE job_number = ${number} LIMIT 1`)
  if (used) throw new DomainError(`Pekerjaan pesanan ${number} sudah dipakai transaksi lain`)
  await tx.execute(sql`DELETE FROM job_order_lines WHERE job_number = ${number}`)
  await tx.execute(sql`DELETE FROM stock_moves WHERE doc_type = 'JC' AND doc_number = ${number}`)
  await tx.execute(sql`DELETE FROM job_orders WHERE number = ${number}`)
  await unpost(tx, key, j.journal_id)
}
const removeMaterialAdjustment: Remove = async (tx, number, key) => {
  const [m] = await tx.execute(sql`SELECT m.journal_id, ro.number AS ro FROM material_adjustments m LEFT JOIN roll_overs ro ON ro.job_number = m.job_number WHERE m.number = ${number} FOR UPDATE OF m`)
  if (!m) throw new DomainError(`Penambahan bahan baku ${number} tidak ditemukan`)
  if (m.ro) throw new DomainError(`Pekerjaan pesanan sudah selesai (${m.ro})`)
  await tx.execute(sql`DELETE FROM material_adjustment_lines WHERE adjustment_number = ${number}`)
  await tx.execute(sql`DELETE FROM stock_moves WHERE doc_type = 'MA' AND doc_number = ${number}`)
  await tx.execute(sql`DELETE FROM material_adjustments WHERE number = ${number}`)
  await unpost(tx, key, m.journal_id)
}
const removeRollOver: Remove = async (tx, number, key) => {
  const [r] = await tx.execute(sql`SELECT journal_id FROM roll_overs WHERE number = ${number} FOR UPDATE`)
  if (!r) throw new DomainError(`Penyelesaian pesanan ${number} tidak ditemukan`)
  await tx.execute(sql`DELETE FROM roll_over_lines WHERE roll_over_number = ${number}`)
  await tx.execute(sql`DELETE FROM stock_moves WHERE doc_type = 'RO' AND doc_number = ${number}`)
  await tx.execute(sql`DELETE FROM roll_overs WHERE number = ${number}`)
  await unpost(tx, key, r.journal_id)
}

function deleter(remove: Remove, type: string) {
  return (db: Db, number: string, idempotencyKey: string) => db.transaction(async tx => {
    const [done] = await tx.execute(sql`SELECT result FROM command_results WHERE idempotency_key = ${idempotencyKey}`)
    if (done) return done.result as { number: string }
    await remove(tx, number, idempotencyKey)
    await tx.execute(sql`INSERT INTO command_results (idempotency_key, command_type, result) VALUES (${idempotencyKey}, ${type}, ${JSON.stringify({ number })}::jsonb)`)
    return { number }
  })
}
function editor<I extends { idempotencyKey: string; number?: string }>(remove: Remove, create: (tx: Tx, raw: I) => Promise<{ number: string }>, parse: (raw: I) => unknown) {
  return (db: Db, number: string, raw: I) => {
    parse(raw) // a bad edit is refused before anything is taken back
    return db.transaction(async tx => {
      const [done] = await tx.execute(sql`SELECT result FROM command_results WHERE idempotency_key = ${raw.idempotencyKey}`)
      if (done) return done.result as { number: string }
      await remove(tx, number, raw.idempotencyKey)
      return create(tx, { ...raw, number: raw.number ?? number })
    })
  }
}
export const deleteJobOrder = deleter(removeJobOrder, 'DeleteJobOrder')
export const deleteMaterialAdjustment = deleter(removeMaterialAdjustment, 'DeleteMaterialAdjustment')
export const deleteRollOver = deleter(removeRollOver, 'DeleteRollOver')
export const editJobOrder = editor<z.input<typeof jobInput>>(removeJobOrder, createJobOrder, r => jobInput.parse(r))
export const editMaterialAdjustment = editor<z.input<typeof adjInput>>(removeMaterialAdjustment, createMaterialAdjustment, r => adjInput.parse(r))
export const editRollOver = editor<z.input<typeof rollInput>>(removeRollOver, createRollOver, r => rollInput.parse(r))
