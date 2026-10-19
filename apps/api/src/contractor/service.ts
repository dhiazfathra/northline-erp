import { sql } from 'drizzle-orm'
import { z } from 'zod'
import type { Db, Tx } from '../db'
import { DomainError } from '../ledger/deciders'
import { handleTx } from '../ledger/handler'
import { catchUp, ledgerProjection } from '../projections'
import { addMove, costingMethod, costOut, layers, loadMoves } from '../inventory/fifo'
import { merge, nextNumber, period } from '../sales/service'

// Proyek Kontraktor (ADR-0038; fixtures/contractor/projects-k.json `contractor`). Every journal line names the contractor
// project, so the 110506 journal, bank mutation and P&L reports select by it. RAB totals are derived, never stored.
const rp = (c: number) => (c / 100).toFixed(2)
const cents = (n: number) => Math.round(n * 100)

const projectInput = z.object({
  no: z.string().trim().min(1), name: z.string().trim().min(1), customer: z.string().optional(), manager: z.string().default(''),
  targetStart: z.string(), finishDate: z.string().optional(), description: z.string().default(''), warehouse: z.string().optional(),
  wipAccount: z.string(), cogsAccount: z.string(), incomeAccount: z.string(),
})

export async function upsertContractorProject(db: Db, raw: z.input<typeof projectInput>) {
  const p = projectInput.parse(raw)
  await db.execute(sql`INSERT INTO contractor_projects (no, name, customer_no, manager, target_start, finish_date, description, warehouse, wip_account, cogs_account, income_account)
    VALUES (${p.no}, ${p.name}, ${p.customer ?? null}, ${p.manager}, ${p.targetStart}, ${p.finishDate ?? null}, ${p.description}, ${p.warehouse ?? null}, ${p.wipAccount}, ${p.cogsAccount}, ${p.incomeAccount})
    ON CONFLICT (no) DO UPDATE SET name = EXCLUDED.name, customer_no = EXCLUDED.customer_no, manager = EXCLUDED.manager, target_start = EXCLUDED.target_start,
      finish_date = EXCLUDED.finish_date, description = EXCLUDED.description, warehouse = EXCLUDED.warehouse, wip_account = EXCLUDED.wip_account,
      cogs_account = EXCLUDED.cogs_account, income_account = EXCLUDED.income_account`)
}

async function project(tx: Tx, no: string) {
  const [p] = await tx.execute(sql`SELECT no, wip_account, cogs_account, warehouse FROM contractor_projects WHERE no = ${no}`)
  if (!p) throw new DomainError(`Proyek kontraktor ${no} tidak ditemukan`)
  return { no, wip: p.wip_account as string, cogs: p.cogs_account as string, warehouse: (p.warehouse as string | null) ?? 'Utama' }
}

/** A RAB task of the project's RAB by name; its resource by name when given. */
async function task(tx: Tx, projectNo: string, name: string, resource?: string) {
  const [t] = await tx.execute(sql`SELECT t.id, t.volume FROM rab_tasks t JOIN rabs r ON r.number = t.rab WHERE r.project = ${projectNo} AND t.name = ${name}`)
  if (!t) throw new DomainError(`Pekerjaan RAB ${name} tidak ditemukan`)
  if (resource === undefined) return { id: Number(t.id), volume: Number(t.volume), resource: null }
  const [r] = await tx.execute(sql`SELECT id FROM rab_resources WHERE task_id = ${t.id} AND name = ${resource}`)
  if (!r) throw new DomainError(`Rincian RAB ${resource} tidak ditemukan`)
  return { id: Number(t.id), volume: Number(t.volume), resource: Number(r.id) }
}

async function once<T>(tx: Tx, key: string): Promise<T | undefined> {
  const [done] = await tx.execute(sql`SELECT result FROM command_results WHERE idempotency_key = ${key}`)
  return done?.result as T | undefined
}
const remember = (tx: Tx, key: string, type: string, result: unknown) =>
  tx.execute(sql`INSERT INTO command_results (idempotency_key, command_type, result) VALUES (${key}, ${type}, ${JSON.stringify(result)}::jsonb)`)

const rabInput = z.object({
  idempotencyKey: z.string().min(8), number: z.string().optional(), project: z.string(), date: z.string(), feePct: z.number().min(0).default(0), description: z.string().default(''),
  groups: z.array(z.object({ number: z.string(), name: z.string(), tasks: z.array(z.object({
    name: z.string(), volume: z.number().positive(), unit: z.string().default(''), bufferPct: z.number().min(0).default(0), startDate: z.string().optional(), endDate: z.string().optional(),
    resources: z.array(z.object({ item: z.string().optional(), account: z.string().optional(), name: z.string(), unit: z.string().default(''), qty: z.number().positive(), unitCost: z.number().nonnegative() })
      .refine(r => !r.item !== !r.account, 'Rincian butuh barang atau akun')).min(1),
  })).min(1) })).min(1),
})

/** RAB (BGP): task unit cost = Σ resource cost / volume; selling unit price = unit cost + buffer %. */
export async function createRab(db: Db, raw: z.input<typeof rabInput>) {
  const r = rabInput.parse(raw)
  return db.transaction(async tx => {
    const done = await once<{ number: string }>(tx, r.idempotencyKey)
    if (done) return done
    await project(tx, r.project)
    const number = r.number ?? await nextNumber(tx, `BGP.${period(r.date)}`)
    await tx.execute(sql`INSERT INTO rabs (number, project, date, fee_pct, description) VALUES (${number}, ${r.project}, ${r.date}, ${r.feePct}, ${r.description})`)
    let seq = 0
    for (const g of r.groups) for (const t of g.tasks) {
      const unitCost = Math.round(t.resources.reduce((s, x) => s + cents(x.qty * x.unitCost), 0) / t.volume)
      const [{ id }] = (await tx.execute(sql`INSERT INTO rab_tasks (rab, group_no, group_name, seq, name, volume, unit, unit_cost, buffer_pct, unit_price, start_date, end_date)
        VALUES (${number}, ${g.number}, ${g.name}, ${++seq}, ${t.name}, ${t.volume}, ${t.unit}, ${unitCost}, ${t.bufferPct}, ${Math.round(unitCost * (1 + t.bufferPct / 100))}, ${t.startDate ?? null}, ${t.endDate ?? null})
        RETURNING id`)) as any
      for (const [i, x] of t.resources.entries())
        await tx.execute(sql`INSERT INTO rab_resources (task_id, seq, item_no, account_no, name, unit, quantity, unit_cost) VALUES (${id}, ${i + 1}, ${x.item ?? null}, ${x.account ?? null}, ${x.name}, ${x.unit}, ${x.qty}, ${cents(x.unitCost)})`)
    }
    const result = { number }
    await remember(tx, r.idempotencyKey, 'CreateRab', result)
    return result
  })
}

const usageInput = z.object({
  idempotencyKey: z.string().min(8), number: z.string().optional(), project: z.string(), date: z.string(), description: z.string().default(''),
  lines: z.array(z.object({ task: z.string(), resource: z.string().optional(), item: z.string(), qty: z.number().positive(), warehouse: z.string().optional() })).min(1),
})

/** Bahan Baku Terpakai (MEQ): stock out at cost, Dr project-in-progress / Cr inventory per account. */
export async function createMaterialUsage(db: Db, raw: z.input<typeof usageInput>) {
  const u = usageInput.parse(raw)
  return db.transaction(async tx => {
    const done = await once<{ number: string }>(tx, u.idempotencyKey)
    if (done) return done
    const p = await project(tx, u.project), cm = await costingMethod(tx)
    const number = u.number ?? await nextNumber(tx, `MEQ.${period(u.date)}`)
    const ls = []
    for (const l of u.lines) {
      const [it] = await tx.execute(sql`SELECT unit, inventory_account FROM items WHERE no = ${l.item} AND type = 'INVENTORY'`)
      if (!it) throw new DomainError(`Barang persediaan ${l.item} tidak ditemukan`)
      const exact = costOut(layers(await loadMoves(tx, l.item, u.date), cm), l.qty, cm)
      ls.push({ ...l, t: await task(tx, u.project, l.task, l.resource), unit: it.unit as string, inv: it.inventory_account as string, exact, cost: Math.round(exact), warehouse: l.warehouse ?? p.warehouse })
      await addMove(tx, { item: l.item, date: u.date, docType: 'MEQ', docNumber: number, description: u.description, quantity: -l.qty, value: -exact, warehouse: l.warehouse ?? p.warehouse })
    }
    const total = ls.reduce((s, l) => s + l.cost, 0), journalId = crypto.randomUUID()
    await handleTx(tx, {
      type: 'PostJournal', idempotencyKey: `${u.idempotencyKey}:journal`, journalId, number, sourceType: 'MEQ', date: u.date, description: u.description,
      lines: [{ account: p.wip, side: 'DEBIT' as const, amount: rp(total), contractorProject: p.no },
        ...merge(ls.map(l => ({ account: l.inv, amount: l.cost }))).map(l => ({ account: l.account, side: 'CREDIT' as const, amount: rp(l.amount), contractorProject: p.no }))],
    })
    await tx.execute(sql`INSERT INTO material_usages VALUES (${number}, ${p.no}, ${u.date}, ${u.description}, ${journalId})`)
    for (const [i, l] of ls.entries())
      await tx.execute(sql`INSERT INTO material_usage_lines VALUES (${number}, ${i + 1}, ${l.t.id}, ${l.t.resource}, ${l.item}, ${l.qty}, ${l.unit}, ${l.warehouse}, ${l.cost})`)
    const result = { number }
    await remember(tx, u.idempotencyKey, 'CreateMaterialUsage', result)
    return result
  })
}

const surveyInput = z.object({
  idempotencyKey: z.string().min(8), number: z.string().optional(), project: z.string(), date: z.string(), surveyor: z.string().default(''), description: z.string().default(''),
  lines: z.array(z.object({ task: z.string(), progressQty: z.number().nonnegative() })).min(1),
})

/** Survei Proyek (PSV): progress quantity per RAB task, portion = qty / volume; reporting only, no journal. */
export async function createSurvey(db: Db, raw: z.input<typeof surveyInput>) {
  const s = surveyInput.parse(raw)
  return db.transaction(async tx => {
    const done = await once<{ number: string }>(tx, s.idempotencyKey)
    if (done) return done
    await project(tx, s.project)
    const number = s.number ?? await nextNumber(tx, `PSV.${period(s.date)}`)
    await tx.execute(sql`INSERT INTO surveys VALUES (${number}, ${s.project}, ${s.date}, ${s.surveyor}, ${s.description})`)
    for (const l of s.lines) {
      const t = await task(tx, s.project, l.task)
      await tx.execute(sql`INSERT INTO survey_lines VALUES (${number}, ${t.id}, ${l.progressQty}, ${Math.min(100, l.progressQty / t.volume * 100)})`)
    }
    const result = { number }
    await remember(tx, s.idempotencyKey, 'CreateSurvey', result)
    return result
  })
}

const docInput = z.object({
  idempotencyKey: z.string().min(8), number: z.string(), sourceType: z.enum(['PI', 'PP', 'OP', 'SDP', 'SI', 'SR', 'OD', 'JV']), date: z.string(), description: z.string().default(''), project: z.string(),
  lines: z.array(z.object({ account: z.string(), side: z.enum(['DEBIT', 'CREDIT']), amount: z.number().positive() })).min(1),
  /** Realisasi: cost lines against a RAB resource (task + resource) or out of budget (name only). */
  /** qty omitted (a payment line has none): the resource's planned quantity (Accurate prints 7 Hari for 110103.2026.05.00010), else 1. */
  costs: z.array(z.object({ task: z.string().optional(), resource: z.string().optional(), name: z.string(), qty: z.number().optional(), amount: z.number() })).default([]),
  /** Sales invoice billing RAB groups: cost entry = RAB work total × sharePct (ADR-0038). */
  billing: z.object({ groups: z.array(z.string()).min(1), sharePct: z.number().positive().max(100) }).optional(),
})

/** A purchase invoice / payment / receipt / sales invoice booked to a contractor project: its journal with every line tagged. */
export async function postProjectDocument(db: Db, raw: z.input<typeof docInput>) {
  const d = docInput.parse(raw)
  return db.transaction(async tx => {
    const done = await once<{ number: string }>(tx, d.idempotencyKey)
    if (done) return done
    const p = await project(tx, d.project)
    const lines = d.lines.map(l => ({ account: l.account, side: l.side, amount: rp(cents(l.amount)), contractorProject: p.no }))
    if (d.billing) {
      const [{ work }] = (await tx.execute(sql`SELECT COALESCE(SUM(t.volume * t.unit_cost), 0) AS work FROM rab_tasks t JOIN rabs r ON r.number = t.rab WHERE r.project = ${p.no}`)) as any
      const entry = Math.round(Number(work) * d.billing.sharePct / 100)
      lines.unshift({ account: p.cogs, side: 'DEBIT', amount: rp(entry), contractorProject: p.no })
      lines.push({ account: p.wip, side: 'CREDIT', amount: rp(entry), contractorProject: p.no })
      for (const g of d.billing.groups) await tx.execute(sql`INSERT INTO project_billings (invoice, project, group_no, share_pct, date) VALUES (${d.number}, ${p.no}, ${g}, ${d.billing.sharePct}, ${d.date})`)
    }
    await handleTx(tx, { type: 'PostJournal', idempotencyKey: `${d.idempotencyKey}:journal`, journalId: crypto.randomUUID(), number: d.number, sourceType: d.sourceType, date: d.date, description: d.description, lines })
    for (const [i, c] of d.costs.entries()) {
      const r = c.task ? (await task(tx, p.no, c.task, c.resource)).resource : null
      const [planned] = r === null ? [] : await tx.execute(sql`SELECT quantity FROM rab_resources WHERE id = ${r}`)
      await tx.execute(sql`INSERT INTO project_costs VALUES (${d.number}, ${i + 1}, ${p.no}, ${d.date}, ${r}, ${c.name}, ${c.qty ?? Number(planned?.quantity ?? 1)}, ${cents(c.amount)})`)
    }
    const result = { number: d.number }
    await remember(tx, d.idempotencyKey, 'PostProjectDocument', result)
    return result
  })
}

const completionInput = z.object({
  idempotencyKey: z.string().min(8), number: z.string().optional(), project: z.string(), date: z.string(), description: z.string().default(''),
  returns: z.array(z.object({ item: z.string(), qty: z.number().positive(), warehouse: z.string().optional() })).default([]),
})

/** Penyelesaian Proyek (FPC): leftover stock back at the project's usage cost, then the remaining WIP balance closed to COGS. */
export async function createProjectCompletion(db: Db, raw: z.input<typeof completionInput>) {
  const f = completionInput.parse(raw)
  // the WIP balance is read from journal_lines, which the ledger projection fills asynchronously
  await catchUp(db, ledgerProjection)
  return db.transaction(async tx => {
    const done = await once<{ number: string }>(tx, f.idempotencyKey)
    if (done) return done
    const p = await project(tx, f.project)
    const [closed] = await tx.execute(sql`SELECT number FROM project_completions WHERE project = ${p.no}`)
    if (closed) throw new DomainError(`Proyek ${p.no} sudah selesai (${closed.number})`)
    const number = f.number ?? await nextNumber(tx, `FPC.${period(f.date)}`)
    const rets = []
    for (const r of f.returns) {
      const [u] = await tx.execute(sql`SELECT SUM(l.amount) AS amount, SUM(l.quantity) AS qty, MIN(i.unit) AS unit, MIN(i.inventory_account) AS inv
        FROM material_usage_lines l JOIN material_usages m ON m.number = l.usage_number JOIN items i ON i.no = l.item_no WHERE m.project = ${p.no} AND l.item_no = ${r.item}`)
      if (!u?.qty || Number(u.qty) < r.qty) throw new DomainError(`Sisa barang ${r.item} melebihi pemakaian proyek`)
      rets.push({ ...r, unit: u.unit as string, inv: u.inv as string, amount: Math.round(Number(u.amount) * r.qty / Number(u.qty)), warehouse: r.warehouse ?? p.warehouse })
    }
    const back = rets.reduce((s, r) => s + r.amount, 0)
    const [{ bal }] = (await tx.execute(sql`SELECT COALESCE(SUM(debit - credit), 0) AS bal FROM journal_lines WHERE account_no = ${p.wip} AND contractor_project = ${p.no}`)) as any
    const rest = Number(bal) - back, journalId = crypto.randomUUID(), tag = { contractorProject: p.no }
    const close = rest < 0
      ? [{ account: p.wip, side: 'DEBIT' as const, amount: rp(-rest), ...tag }, { account: p.cogs, side: 'CREDIT' as const, amount: rp(-rest), ...tag }]
      : rest > 0 ? [{ account: p.cogs, side: 'DEBIT' as const, amount: rp(rest), ...tag }, { account: p.wip, side: 'CREDIT' as const, amount: rp(rest), ...tag }] : []
    const lines = [...(back ? [{ account: p.wip, side: 'CREDIT' as const, amount: rp(back), ...tag }] : []), ...close,
      ...merge(rets.map(r => ({ account: r.inv, amount: r.amount }))).map(l => ({ account: l.account, side: 'DEBIT' as const, amount: rp(l.amount), ...tag }))]
    if (lines.length) await handleTx(tx, { type: 'PostJournal', idempotencyKey: `${f.idempotencyKey}:journal`, journalId, number, sourceType: 'FPC', date: f.date, description: f.description, lines })
    await tx.execute(sql`INSERT INTO project_completions VALUES (${number}, ${p.no}, ${f.date}, ${journalId})`)
    for (const [i, r] of rets.entries()) {
      await tx.execute(sql`INSERT INTO project_completion_returns VALUES (${number}, ${i + 1}, ${r.item}, ${r.qty}, ${r.unit}, ${r.warehouse}, ${r.amount})`)
      await addMove(tx, { item: r.item, date: f.date, docType: 'FPC', docNumber: number, description: f.description, quantity: r.qty, value: r.amount, warehouse: r.warehouse })
    }
    const result = { number }
    await remember(tx, f.idempotencyKey, 'CreateProjectCompletion', result)
    return result
  })
}
