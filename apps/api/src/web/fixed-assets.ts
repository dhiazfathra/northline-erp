import { sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { isoDate } from '@northline/schemas/ledger-es'
import type { AuthEnv } from '../auth'
import type { Db } from '../db'
import { DomainError } from '../ledger/deciders'
import { nextNumber, period } from '../sales/service'

/** Aset Tetap screen reads (ADR-0049). Amounts in rupiah, the unit POST/PUT /api/fixed-assets take, so the form round-trips. */
async function loadAssets(db: Db, number?: string) {
  const where = number ? sql`WHERE a.number = ${number}` : sql``
  const rows = await db.execute(sql`SELECT a.number, a.description, a.category, to_char(a.date,'YYYY-MM-DD') AS date, to_char(a.usage_date,'YYYY-MM-DD') AS usage_date,
      a.life_months, a.asset_account, a.location, a.department, a.note, a.tax, a.qty, a.salvage, a.accumulated_account, a.expense_account,
      EXISTS (SELECT 1 FROM fixed_asset_disposals d WHERE d.asset_number = a.number) AS disposed,
      (SELECT to_char(MAX(d.date),'YYYY-MM-DD') FROM depreciations d WHERE d.asset_number = a.number) AS last_dep
    FROM fixed_assets a ${where} ORDER BY a.number DESC`)
  const ex = await db.execute(sql`SELECT asset_number, name, to_char(date,'YYYY-MM-DD') AS date, amount, account, expenditure_number FROM fixed_asset_expenditures
    ${number ? sql`WHERE asset_number = ${number}` : sql``} ORDER BY asset_number, seq`)
  return rows.map(r => ({
    number: r.number as string, description: r.description as string, category: r.category as string, date: r.date as string, usageDate: r.usage_date as string,
    lifeMonths: Number(r.life_months), assetAccount: r.asset_account as string, accumulatedAccount: r.accumulated_account as string, expenseAccount: r.expense_account as string,
    location: r.location as string, department: r.department as string, note: r.note as string, tax: r.tax as boolean, qty: Number(r.qty), salvage: Number(r.salvage) / 100,
    status: r.disposed ? 'disposed' as const : 'active' as const, lastDep: (r.last_dep as string | null) ?? '',
    expenditures: ex.filter(e => e.asset_number === r.number).map(e => ({ name: e.name as string, date: e.date as string, amount: Number(e.amount) / 100, account: e.account as string, expenditure: (e.expenditure_number as string | null) ?? undefined })),
  }))
}

const expenditureInput = z.object({
  idempotencyKey: z.string().min(8), date: isoDate, description: z.string().trim().min(1), assetCode: z.string().default(''), note: z.string().default(''),
  dpp: z.number().min(0), applyDp: z.boolean().default(false),
  lines: z.array(z.object({ code: z.string().min(1), qty: z.number().int().positive(), note: z.string().default('') })).min(1),
})

/** Pengeluaran Aset saved as a draft on the default branch. Posts no journal: no existing flow capitalises it into the asset yet. */
async function createExpenditure(db: Db, raw: unknown) {
  const a = expenditureInput.parse(raw)
  if (a.applyDp) throw new DomainError('Uang muka pengeluaran aset belum tersedia')
  return db.transaction(async tx => {
    const [done] = await tx.execute(sql`SELECT result FROM command_results WHERE idempotency_key = ${a.idempotencyKey}`)
    if (done) return done.result as { number: string }
    const [branch] = await tx.execute(sql`SELECT name FROM branches ORDER BY is_default DESC, name LIMIT 1`)
    if (!branch) throw new DomainError('Cabang belum diatur')
    const codes = [...new Set(a.lines.map(l => l.code))]
    const known = new Set((await tx.execute(sql`SELECT number FROM fixed_assets WHERE number IN (${sql.join(codes.map(c => sql`${c}`), sql`, `)})`)).map(r => r.number as string))
    const unknown = codes.find(c => !known.has(c))
    if (unknown) throw new DomainError(`Aset ${unknown} tidak ditemukan`)
    const number = await nextNumber(tx, `AX.${period(a.date)}`)
    const dpp = Math.round(a.dpp * 100)
    // Total = DPP + PPN 11%, the figure the form shows.
    await tx.execute(sql`INSERT INTO asset_expenditures (number, date, description, asset_code, note, qty, dpp, total, branch)
      VALUES (${number}, ${a.date}, ${a.description}, ${a.assetCode}, ${a.note}, ${a.lines.reduce((s, l) => s + l.qty, 0)}, ${dpp}, ${dpp + Math.round(dpp * 0.11)},
        ${branch.name})`)
    for (const [i, l] of a.lines.entries())
      await tx.execute(sql`INSERT INTO asset_expenditure_lines (expenditure_number, seq, asset_number, qty, note) VALUES (${number}, ${i + 1}, ${l.code}, ${l.qty}, ${l.note})`)
    const result = { number }
    await tx.execute(sql`INSERT INTO command_results (idempotency_key, command_type, result) VALUES (${a.idempotencyKey}, 'CreateAssetExpenditure', ${JSON.stringify(result)}::jsonb)`)
    return result
  })
}

export function fixedAssetRoutes(db: Db) {
  return new Hono<AuthEnv>()
    .get('/branches', async c => c.json((await db.execute(sql`SELECT name FROM branches ORDER BY name`)).map(b => b.name as string)))
    // Aset per Lokasi: an asset's location names a branch; counts assets held (not disposed) on the date.
    .get('/locations', async c => {
      const { branch, date } = z.object({ branch: z.string().optional(), date: isoDate }).parse(c.req.query())
      const rows = await db.execute(sql`SELECT a.location AS name, COALESCE(b.address, '') AS address, SUM(a.qty) AS qty FROM fixed_assets a LEFT JOIN branches b ON b.name = a.location
        WHERE a.date <= ${date} AND a.location <> '' AND NOT EXISTS (SELECT 1 FROM fixed_asset_disposals d WHERE d.asset_number = a.number AND d.date <= ${date})
          ${branch ? sql`AND a.location = ${branch}` : sql``}
        GROUP BY a.location, b.address ORDER BY a.location`)
      return c.json(rows.map(r => ({ name: r.name as string, address: r.address as string, qty: Number(r.qty) })))
    })
    .get('/expenditures', async c => c.json((await db.execute(sql`SELECT number, to_char(date,'DD/MM/YYYY') AS date, description, qty, total, status, branch
        FROM asset_expenditures ORDER BY date DESC, number DESC`))
      .map(r => ({ id: r.number as string, number: r.number as string, date: r.date as string, description: r.description as string, qty: Number(r.qty), total: Number(r.total) / 100, status: r.status as 'Draf' | 'Disetujui', branch: r.branch as string }))))
    .post('/expenditures', async c => c.json(await createExpenditure(db, await c.req.json()), 201))
    .get('/', async c => c.json(await loadAssets(db)))
    .get('/:number', async c => {
      const [a] = await loadAssets(db, z.string().min(1).parse(c.req.param('number')))
      return a ? c.json(a) : c.json({ error: 'Aset tidak ditemukan' }, 404)
    })
}
