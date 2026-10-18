import { sql } from 'drizzle-orm'
import { z } from 'zod'
import { isoDate, periodId } from '@northline/schemas/ledger-es'
import type { Db } from '../db'
import { DomainError } from '../ledger/deciders'
import { handleTx } from '../ledger/handler'
import { merge, nextNumber, period } from '../sales/service'

// Fixed assets and month-end depreciation as the sandbox does them (fixtures/fixed-asset-t5.json):
// straight line, a full month from the acquisition month, one month-end journal per period named "<Bulan> <yyyy>".

export const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const rupiah = (c: number) => (c / 100).toFixed(2)

export const fixedAssetInput = z.object({
  idempotencyKey: z.string().min(8),
  number: z.string().optional(),
  description: z.string().min(1),
  category: z.string().min(1),
  date: isoDate,
  usageDate: isoDate.optional(),
  lifeMonths: z.number().int().positive(),
  assetAccount: z.string(), accumulatedAccount: z.string(), expenseAccount: z.string(),
  expenditures: z.array(z.object({ name: z.string().min(1), date: isoDate, amount: z.union([z.number(), z.string()]).transform(v => Math.round(Number(v) * 100)), account: z.string() })).min(1),
})

export async function createFixedAsset(db: Db, input: z.input<typeof fixedAssetInput>) {
  const a = fixedAssetInput.parse(input)
  return db.transaction(async tx => {
    const [done] = await tx.execute(sql`SELECT result FROM command_results WHERE idempotency_key = ${a.idempotencyKey}`)
    if (done) return done.result as { number: string }
    const cost = a.expenditures.reduce((s, e) => s + e.amount, 0)
    const number = a.number ?? await nextNumber(tx, `FAA.${period(a.date)}`)
    // The sandbox's acquisition also consumes the month's Jurnal Umum counter (its first depreciation is JV.yyyy.mm.00002).
    await nextNumber(tx, `JV.${period(a.date)}`)
    const journalId = crypto.randomUUID()
    await handleTx(tx, {
      type: 'PostJournal', idempotencyKey: `${a.idempotencyKey}:journal`, journalId, number, sourceType: 'FA', date: a.date, description: a.description,
      lines: [{ account: a.assetAccount, side: 'DEBIT', amount: rupiah(cost) }, ...merge(a.expenditures.map(e => ({ account: e.account, amount: e.amount }))).map(e => ({ account: e.account, side: 'CREDIT' as const, amount: rupiah(e.amount) }))],
    })
    await tx.execute(sql`INSERT INTO fixed_assets (number, description, category, date, usage_date, life_months, method, asset_account, accumulated_account, expense_account, cost, journal_id)
      VALUES (${number}, ${a.description}, ${a.category}, ${a.date}, ${a.usageDate ?? a.date}, ${a.lifeMonths}, 'STRAIGHTLINE', ${a.assetAccount}, ${a.accumulatedAccount}, ${a.expenseAccount}, ${cost}, ${journalId})`)
    for (const [i, e] of a.expenditures.entries())
      await tx.execute(sql`INSERT INTO fixed_asset_expenditures (asset_number, seq, name, date, amount, account) VALUES (${number}, ${i + 1}, ${e.name}, ${e.date}, ${e.amount}, ${e.account})`)
    const result = { number }
    await tx.execute(sql`INSERT INTO command_results (idempotency_key, command_type, result) VALUES (${a.idempotencyKey}, 'CreateFixedAsset', ${JSON.stringify(result)}::jsonb)`)
    return result
  })
}

/** Straight-line monthly amount; the last month takes the rounding remainder so the asset ends at zero book value. */
export function monthlyDepreciation(cost: number, life: number, monthIndex: number) {
  const base = Math.round(cost / life)
  return monthIndex < life - 1 ? base : cost - base * (life - 1)
}

/** Proses Akhir Bulan (depreciation only): one journal per period, Dr expense / Cr accumulated, merged per account. */
export async function runPeriodEnd(db: Db, input: { idempotencyKey: string; period: string }) {
  const { period: p, idempotencyKey } = z.object({ idempotencyKey: z.string().min(8), period: periodId }).parse(input)
  return db.transaction(async tx => {
    const [done] = await tx.execute(sql`SELECT result FROM command_results WHERE idempotency_key = ${idempotencyKey}`)
    if (done) return done.result as { number: string }
    const [exists] = await tx.execute(sql`SELECT 1 FROM period_ends WHERE period = ${p}`)
    if (exists) throw new DomainError(`Proses akhir bulan ${p} sudah dijalankan`)
    const [y, m] = p.split('-').map(Number) as [number, number]
    const date = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)
    const number = `${BULAN[m - 1]} ${y}`
    await tx.execute(sql`INSERT INTO period_ends (period, number, date) VALUES (${p}, ${number}, ${date})`)
    const assets = await tx.execute(sql`SELECT a.number, a.cost, a.life_months, to_char(a.usage_date,'YYYY-MM') AS start, a.accumulated_account, a.expense_account,
      (SELECT COUNT(*) FROM depreciations d WHERE d.asset_number = a.number) AS done FROM fixed_assets a WHERE a.usage_date <= ${date} ORDER BY a.number`)
    const deps: { asset: string; amount: number; exp: string; acc: string }[] = []
    for (const a of assets) {
      const idx = Number(a.done)
      if (idx >= Number(a.life_months) || (a.start as string) > p) continue
      deps.push({ asset: a.number as string, amount: monthlyDepreciation(Number(a.cost), Number(a.life_months), idx), exp: a.expense_account as string, acc: a.accumulated_account as string })
    }
    let journalId: string | null = null
    if (deps.length) {
      journalId = crypto.randomUUID()
      await handleTx(tx, {
        type: 'PostJournal', idempotencyKey: `${idempotencyKey}:journal`, journalId, number, sourceType: 'PE', date, description: `Proses Akhir Bulan (${BULAN[m - 1]}, ${y})`,
        lines: [...merge(deps.map(d => ({ account: d.exp, amount: d.amount }))).map(l => ({ account: l.account, side: 'DEBIT' as const, amount: rupiah(l.amount) })),
          ...merge(deps.map(d => ({ account: d.acc, amount: d.amount }))).map(l => ({ account: l.account, side: 'CREDIT' as const, amount: rupiah(l.amount) }))],
      })
      for (const d of deps)
        await tx.execute(sql`INSERT INTO depreciations (asset_number, period, date, jv_number, amount) VALUES (${d.asset}, ${p}, ${date}, ${await nextNumber(tx, `JV.${period(date)}`)}, ${d.amount})`)
    }
    await tx.execute(sql`UPDATE period_ends SET journal_id = ${journalId} WHERE period = ${p}`)
    const result = { number }
    await tx.execute(sql`INSERT INTO command_results (idempotency_key, command_type, result) VALUES (${idempotencyKey}, 'RunPeriodEnd', ${JSON.stringify(result)}::jsonb)`)
    return result
  })
}
