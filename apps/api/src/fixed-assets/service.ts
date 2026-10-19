import { sql } from 'drizzle-orm'
import { z } from 'zod'
import { isoDate, periodId } from '@northline/schemas/ledger-es'
import type { Db, Tx } from '../db'
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
  /** Fiscal category (Aset Fiskal), e.g. Gol 1 [Garis Lurus] = 48 months straight line (docs/reports/DifferentIntermDepreciationReport.md). */
  fiscalLifeMonths: z.number().int().positive().optional(),
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
    if (a.fiscalLifeMonths) await tx.execute(sql`UPDATE fixed_assets SET fiscal_life_months = ${a.fiscalLifeMonths} WHERE number = ${number}`)
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
export async function runPeriodEnd(db: Db | Tx, input: { idempotencyKey: string; period: string }) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(input?.period ?? '')) throw new DomainError('Bulan harus diisi') // Accurate's text
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

/** Takes back a period end: its depreciation rows and journal. */
async function removePeriodEnd(tx: Tx, p: string, idempotencyKey: string) {
  const [pe] = await tx.execute(sql`SELECT journal_id FROM period_ends WHERE period = ${p} FOR UPDATE`)
  if (!pe) throw new DomainError(`Proses akhir bulan ${p} tidak ditemukan`)
  await tx.execute(sql`DELETE FROM depreciations WHERE period = ${p}`)
  await tx.execute(sql`DELETE FROM period_ends WHERE period = ${p}`)
  if (pe.journal_id) await handleTx(tx, { type: 'DeleteJournal', idempotencyKey: `${idempotencyKey}:unpost`, journalId: pe.journal_id as string })
}

export async function deletePeriodEnd(db: Db, p: string, idempotencyKey: string) {
  return db.transaction(async tx => {
    const [done] = await tx.execute(sql`SELECT result FROM command_results WHERE idempotency_key = ${idempotencyKey}`)
    if (done) return done.result as { number: string }
    const [pe] = await tx.execute(sql`SELECT number FROM period_ends WHERE period = ${p}`)
    await removePeriodEnd(tx, p, idempotencyKey)
    const result = { number: pe!.number as string }
    await tx.execute(sql`INSERT INTO command_results (idempotency_key, command_type, result) VALUES (${idempotencyKey}, 'DeletePeriodEnd', ${JSON.stringify(result)}::jsonb)`)
    return result
  })
}

/** Edited in place: taken back and run again for the same period (same number). */
export async function editPeriodEnd(db: Db, p: string, input: { idempotencyKey: string }) {
  return db.transaction(async tx => {
    const [done] = await tx.execute(sql`SELECT result FROM command_results WHERE idempotency_key = ${input.idempotencyKey}`)
    if (done) return done.result as { number: string }
    await removePeriodEnd(tx, p, input.idempotencyKey)
    return runPeriodEnd(tx, { idempotencyKey: input.idempotencyKey, period: p })
  })
}

/** Disposisi Aset Tetap: book value written off to gain/loss, proceeds booked against it as a separate pair (not netted). */
export async function disposeFixedAsset(db: Db, raw: { idempotencyKey: string; number?: string; asset: string; date: string; description?: string; gainLossAccount: string; price?: number; sellingAccount?: string }) {
  return db.transaction(async tx => {
    const [done] = await tx.execute(sql`SELECT result FROM command_results WHERE idempotency_key = ${raw.idempotencyKey}`)
    if (done) return done.result as { number: string }
    const [a] = await tx.execute(sql`SELECT cost, asset_account, accumulated_account, (SELECT COALESCE(SUM(amount),0) FROM depreciations WHERE asset_number = ${raw.asset}) AS acc FROM fixed_assets WHERE number = ${raw.asset}`)
    if (!a) throw new DomainError(`Aset ${raw.asset} tidak ditemukan`)
    const cost = Number(a.cost), acc = Number(a.acc), price = Math.round((raw.price ?? 0) * 100), sold = price > 0
    if (sold && !raw.sellingAccount) throw new DomainError('Akun penjualan harus diisi')
    const number = raw.number ?? await nextNumber(tx, `FAD.${period(raw.date)}`)
    const journalId = crypto.randomUUID()
    await handleTx(tx, {
      type: 'PostJournal', idempotencyKey: `${raw.idempotencyKey}:journal`, journalId, number, sourceType: 'FAD', date: raw.date, description: raw.description ?? '',
      lines: [
        ...(acc ? [{ account: a.accumulated_account as string, side: 'DEBIT' as const, amount: rupiah(acc) }] : []),
        { account: raw.gainLossAccount, side: 'DEBIT' as const, amount: rupiah(cost - acc) },
        { account: a.asset_account as string, side: 'CREDIT' as const, amount: rupiah(cost) },
        ...(sold ? [{ account: raw.sellingAccount!, side: 'DEBIT' as const, amount: rupiah(price) }, { account: raw.gainLossAccount, side: 'CREDIT' as const, amount: rupiah(price) }] : []),
      ].filter(l => Number(l.amount) > 0),
    })
    await tx.execute(sql`INSERT INTO fixed_asset_disposals VALUES (${number}, ${raw.asset}, ${raw.date}, ${raw.description ?? ''}, ${raw.gainLossAccount}, ${sold}, ${price}, ${raw.sellingAccount ?? null}, ${journalId})`)
    const result = { number }
    await tx.execute(sql`INSERT INTO command_results (idempotency_key, command_type, result) VALUES (${raw.idempotencyKey}, 'DisposeFixedAsset', ${JSON.stringify(result)}::jsonb)`)
    return result
  })
}

/** Perubahan Aset Tetap (FAE.yyyy.mm.nnnnn), useful-life change only: no journal (fixtures/asset-edit-t34.json). */
// shortcut: cost, method and account changes (and the depreciation they reschedule) are not modelled.
export async function editFixedAsset(db: Db, e: { number?: string; asset: string; date: string; description?: string; lifeMonths: number }) {
  return db.transaction(async tx => {
    const [a] = await tx.execute(sql`SELECT life_months FROM fixed_assets WHERE number = ${e.asset} FOR UPDATE`)
    if (!a) throw new DomainError(`Aset ${e.asset} tidak ditemukan`)
    const number = e.number ?? await nextNumber(tx, `FAE.${e.date.slice(0, 4)}.${e.date.slice(5, 7)}`)
    await tx.execute(sql`INSERT INTO fixed_asset_edits VALUES (${number}, ${e.asset}, ${e.date}, ${e.description ?? ''}, ${Number(a.life_months)}, ${e.lifeMonths})`)
    await tx.execute(sql`UPDATE fixed_assets SET life_months = ${e.lifeMonths} WHERE number = ${e.asset}`)
    return { number }
  })
}
