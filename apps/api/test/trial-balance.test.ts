import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { sql } from 'drizzle-orm'
import fixture from '../../../docs/reports/fixtures/trial-balance.json'
import { connect, migrate } from '../src/db'
import { handle } from '../src/ledger/handler'
import { catchUp, ledgerProjection, rebuild } from '../src/projections'
import { queryTrialBalance } from '../src/reports/queries'
import { formatRow } from '../src/reports/trial-balance'

// Regression: Accurate's Neraca Percobaan output (docs/reports/fixtures/trial-balance.json) must be reproduced exactly.
// Needs a disposable Postgres: TEST_DATABASE_URL (default: the local docker one from apps/api/README.md).
const url = process.env.TEST_DATABASE_URL ?? 'postgres://postgres:northline@localhost:55432/northline'
const schema = `tb_${process.pid}`
const { client, db } = connect(`${url}?options=-c%20search_path%3D${schema}`)

const RE = '300002' // the sandbox's retained-earnings account

beforeAll(async () => {
  await client.unsafe(`DROP SCHEMA IF EXISTS ${schema} CASCADE; CREATE SCHEMA ${schema}`)
  await migrate(client)
  // Chart of accounts through the Account aggregate; settings reference the projected row.
  for (const a of [...fixture.accounts, { no: RE, name: 'Laba Ditahan', type: 'EQUITY' }])
    await handle(db, { type: 'OpenAccount', idempotencyKey: `acct-${a.no}`, no: a.no, name: a.name, accountType: a.type as any })
  await catchUp(db, ledgerProjection)
  await db.execute(sql`INSERT INTO ledger_settings (retained_earnings_account, fiscal_year_start_month) VALUES (${RE}, ${fixture.fiscalYearStartMonth})`)
  for (const j of fixture.journals)
    await handle(db, { type: 'PostJournal', idempotencyKey: `fixture-${j.ref}`, journalId: crypto.randomUUID(), date: j.date, description: j.description,
      lines: j.lines.map(l => ({ ...l, side: l.side as 'DEBIT' | 'CREDIT' })) })
  await catchUp(db, ledgerProjection)
})
afterAll(async () => {
  await client.unsafe(`DROP SCHEMA IF EXISTS ${schema} CASCADE`)
  await client.end()
})

const run = async (from: string, to: string) =>
  (await queryTrialBalance(db, { from, to, showZeroBalance: false, showParentAccount: true })).map(formatRow)

describe('Neraca Percobaan matches Accurate', () => {
  for (const [name, e] of Object.entries(fixture.expected)) {
    test(`${name} (${e.header})`, async () => {
      const rows = await run(e.from, e.to)
      expect(rows.filter(r => r[0]!.startsWith('NL-T1'))).toEqual(e.rows)
    })
  }

  test('prior-year P&L closes into retained earnings (rule 5)', async () => {
    // Accurate: Laba Ditahan opening moved from 34.002.596 D to 31.002.596 D at 2031-01-01 → 3.000.000 Cr from the fixture.
    expect((await run('2030-12-01', '2030-12-31')).find(r => r[0] === RE)).toBeUndefined()
    expect((await run('2031-02-01', '2031-02-28')).find(r => r[0] === RE)).toEqual([RE, 'Laba Ditahan', '0', '3.000.000', '0', '0', '0', '3.000.000'])
  })

  test('rebuild from position 0 gives identical output', async () => {
    const before = await run('2031-01-01', '2031-03-31')
    await rebuild(db, ledgerProjection)
    expect(await run('2031-01-01', '2031-03-31')).toEqual(before)
  })
})

describe('ledger invariants', () => {
  test('unbalanced journal is rejected', async () => {
    await expect(handle(db, { type: 'PostJournal', idempotencyKey: 'bad-1-unbalanced', journalId: crypto.randomUUID(), date: '2031-03-01',
      lines: [{ account: 'NL-T1-1101', side: 'DEBIT', amount: 100 }, { account: 'NL-T1-3001', side: 'CREDIT', amount: 99 }] })).rejects.toThrow('tidak seimbang')
  })

  test('deferred constraint rejects unbalanced lines written directly to the read model', async () => {
    await expect(db.transaction(async tx => {
      await tx.execute(sql`INSERT INTO journals (journal_id, date, description, global_position) VALUES ('raw-1', '2031-03-01', 'x', 0)`)
      await tx.execute(sql`INSERT INTO journal_lines (journal_id, line_no, date, account_no, debit) VALUES ('raw-1', 1, '2031-03-01', 'NL-T1-1101', 5)`)
    })).rejects.toThrow()
  })

  test('events are append-only', async () => {
    // drizzle wraps the Postgres error; the trigger's message is on `cause`
    const pgError = (q: PromiseLike<unknown>) => Promise.resolve(q).then(() => '', (e: any) => String(e.cause?.message))
    expect(await pgError(db.execute(sql`UPDATE events SET payload = '{}'`))).toContain('append-only')
    expect(await pgError(db.execute(sql`DELETE FROM events`))).toContain('append-only')
  })

  test('same idempotency key does not post twice', async () => {
    const cmd = { type: 'PostJournal' as const, idempotencyKey: 'idem-key-0001', journalId: crypto.randomUUID(), date: '2031-03-02',
      lines: [{ account: 'NL-T1-1101', side: 'DEBIT' as const, amount: '1' }, { account: 'NL-T1-3001', side: 'CREDIT' as const, amount: '1' }] }
    const a = await handle(db, cmd), b = await handle(db, cmd)
    expect(b).toEqual(a)
  })

  test('closed period rejects postings; correction is a reversal in an open period', async () => {
    const id = crypto.randomUUID()
    await handle(db, { type: 'PostJournal', idempotencyKey: 'cp-post-0001', journalId: id, date: '2031-04-10',
      lines: [{ account: 'NL-T1-6001', side: 'DEBIT', amount: '500' }, { account: 'NL-T1-1101', side: 'CREDIT', amount: '500' }] })
    await handle(db, { type: 'ClosePeriod', idempotencyKey: 'cp-close-0001', period: '2031-04' })
    await expect(handle(db, { type: 'PostJournal', idempotencyKey: 'cp-post-0002', journalId: crypto.randomUUID(), date: '2031-04-11',
      lines: [{ account: 'NL-T1-6001', side: 'DEBIT', amount: '1' }, { account: 'NL-T1-1101', side: 'CREDIT', amount: '1' }] })).rejects.toThrow('ditutup')
    await expect(handle(db, { type: 'ReverseJournal', idempotencyKey: 'cp-rev-0001', journalId: id, reversalJournalId: crypto.randomUUID(), date: '2031-04-30' })).rejects.toThrow('ditutup')
    await handle(db, { type: 'ReverseJournal', idempotencyKey: 'cp-rev-0002', journalId: id, reversalJournalId: crypto.randomUUID(), date: '2031-05-02' })
    await catchUp(db, ledgerProjection)
    const may = await run('2031-05-01', '2031-05-31')
    expect(may.find(r => r[0] === 'NL-T1-6001')!.slice(2)).toEqual(['2.250.500,5', '0', '0', '500', '2.250.000,5', '0'])
  })
})

describe('HTTP API', () => {
  test('POST command parses amounts once; GET trial balance waits for the projection', async () => {
    const { createApp } = await import('../src/app')
    const { catchUp: cu } = await import('../src/projections')
    const app = createApp(db)
    const { createFullUser } = await import('./fixture-db')
    expect((await app.request('/api/reports/trial-balance?from=2031-06-01&to=2031-06-30')).status).toBe(401)
    await createFullUser(db, 'akuntan@example.com', 'rahasia-123')
    const bad = await app.request('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'akuntan@example.com', password: 'salah-salah' }) })
    expect(bad.status).toBe(401)
    const login = await app.request('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'akuntan@example.com', password: 'rahasia-123' }) })
    const setCookie = login.headers.get('set-cookie')!
    expect(setCookie).toContain('HttpOnly')
    expect(setCookie).toContain('SameSite=Strict')
    const cookie = setCookie.split(';')[0]!
    const res = await app.request('/api/ledger/commands', { method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify({
      type: 'PostJournal', idempotencyKey: 'http-0001', journalId: crypto.randomUUID(), date: '2031-06-03',
      lines: [{ account: 'NL-T1-2101', side: 'DEBIT', amount: '1500.25' }, { account: 'NL-T1-1101', side: 'CREDIT', amount: 1500.25 }] }) })
    expect(res.status).toBe(202)
    await cu(db, ledgerProjection)
    const tb = await (await app.request('/api/reports/trial-balance?from=2031-06-01&to=2031-06-30', { headers: { cookie } })).json() as any[]
    expect(tb.find(r => r.no === 'NL-T1-2101').debit).toBe(150025)
    await app.request('/api/auth/logout', { method: 'POST', headers: { cookie } })
    expect((await app.request('/api/me', { headers: { cookie } })).status).toBe(401)
  })
})

test('query string booleans: "false" stays false', async () => {
  const { trialBalanceQuery } = await import('@northline/schemas/ledger-es')
  expect(trialBalanceQuery.parse({ from: '2031-01-01', to: '2031-01-31', showParentAccount: 'false' }).showParentAccount).toBe(false)
})

describe('Laba/Rugi and Neraca match Accurate', async () => {
  const fs = (await import('../../../docs/reports/fixtures/financial-statements.json')).default
  const { formatLine, periodLabel } = await import('../src/reports/financial-statements')
  const { queryProfitLoss, queryBalanceSheet } = await import('../src/reports/queries')
  const opts = { showZeroBalance: false, showParentAccount: true }
  // Fixture journals only; later tests in this file add more, so compare against the original posting set.
  for (const [name, e] of Object.entries(fs.profitLoss)) {
    test(`Laba/Rugi ${name}`, async () => {
      const lines = (await queryProfitLoss(db, { from: e.from, to: e.to, ...opts })).map(formatLine)
      expect([['Deskripsi', periodLabel(e.from, e.to)], ...lines]).toEqual(e.rows)
    })
  }
  for (const [name, e] of Object.entries(fs.balanceSheet)) {
    test(`Neraca ${name}`, async () => {
      const lines = (await queryBalanceSheet(db, { asOf: e.asOf, ...opts })).map(formatLine)
      // Sandbox retained earnings carry 34.002.596 D of other data before the fixture; ours starts at 0.
      const expected = e.rows.flatMap(r => r[0] !== 'Laba Ditahan' ? [r] : e.asOf < '2031-01-01' ? [] : [['Laba Ditahan', '3.000.000']])
      expect(lines.filter(l => /^NL-T1|^Laba /.test(l[0]!))).toEqual(expected)
    })
  }
})

test('Neraca: JUMLAH ASET = JUMLAH LIABILITAS DAN EKUITAS', async () => {
  const { queryBalanceSheet } = await import('../src/reports/queries')
  for (const asOf of ['2030-12-31', '2031-02-28', '2031-06-30']) {
    const lines = await queryBalanceSheet(db, { asOf, showZeroBalance: false, showParentAccount: true })
    const total = (l: string) => lines.find(x => x.label === l)!.amount
    expect(total('JUMLAH ASET')).toBe(total('JUMLAH LIABILITAS DAN EKUITAS')!)
  }
})

describe('Buku Besar listings match Accurate', async () => {
  const gl = (await import('../../../docs/reports/fixtures/general-ledger.json')).default
  const { queryGeneralLedger } = await import('../src/reports/queries')
  const cases = [['JournalListReport', 'journal-list'], ['AllJournalReport', 'all-journals'], ['GeneralLedgerHistoryReport', 'history'], ['GeneralLedgerDetailReport', 'detail'], ['JournalDetailListReport', 'account-journal-detail']] as const
  for (const [planId, report] of cases)
    for (const [p, e] of Object.entries(gl[planId] as Record<string, { from: string; to: string; rows: string[][] }>))
      test(`${planId} ${p}`, async () => {
        expect(await queryGeneralLedger(db, report, { from: e.from, to: e.to, showZeroBalance: false, showParentAccount: true })).toEqual(e.rows)
      })
  for (const p of ['feb', 'span'] as const)
    test(`GeneralLedgerSummaryReport ${p}`, async () => {
      const e = gl.GeneralLedgerSummaryReport[p]
      const rows = await queryGeneralLedger(db, 'summary', { from: e.from, to: e.to, showZeroBalance: false, showParentAccount: true })
      // Sandbox Laba Ditahan includes 34.002.596 D of unrelated history; ours holds only the fixture's closed-year income.
      const re = e.from < '2031-01-01' ? [] : [['300002', 'Laba Ditahan', '3.000.000', '0', '0', '3.000.000']]
      expect(rows.filter(r => /^NL-T1|^300002$/.test(r[0]!))).toEqual([...re, ...e.rows.filter(r => r[0] !== '300002')])
    })
})

test('GlAccountListReport (Daftar Akun Perkiraan) feb', async () => {
  const gl = (await import('../../../docs/reports/fixtures/general-ledger.json')).default
  const { queryGeneralLedger } = await import('../src/reports/queries')
  const e = gl.GlAccountListReport.feb
  const rows = await queryGeneralLedger(db, 'account-list', { from: e.asOf, to: e.asOf, showZeroBalance: true, showParentAccount: true })
  expect(rows[0]).toEqual(e.header)
  // Sandbox Laba Ditahan carries unrelated history (34.002.596 D); ours only the fixture's closed-year income.
  expect(rows.filter(r => /^NL-T1|^300002$/.test(r[0]!))).toEqual(e.rows.map(r => (r[0] === '300002' ? ['300002', 'Laba Ditahan', 'Modal', '3.000.000'] : r)))
})

describe('Keuangan multi-column variants match Accurate', async () => {
  const fs = (await import('../../../docs/reports/fixtures/financial-statements.json')).default
  const F = await import('../src/reports/financial-statements')
  const { sql: q } = await import('drizzle-orm')
  const o = { showZeroBalance: false, showParentAccount: true }
  const load = async () => {
    const accounts = (await db.execute(q`SELECT no, name, type, parent_no FROM accounts`)).map(r => ({ no: r.no as string, name: r.name as string, type: r.type as any, parentNo: (r.parent_no as string) ?? null }))
    // only the six fixture journals (later tests post more from March 2031 on)
    const balances = (await db.execute(q`SELECT account_no, to_char(date,'YYYY-MM-DD') AS date, debit, credit FROM account_daily_balances WHERE date <= '2031-02-28'`))
      .map(r => ({ account: r.account_no as string, date: r.date as string, debit: Number(r.debit), credit: Number(r.credit) }))
    return { accounts, balances, settings: { retainedEarningsAccount: RE, fiscalYearStartMonth: 1 } }
  }

  test('Laba/Rugi (Multi Periode) Des 2030 – Feb 2031', async () => {
    const { accounts, balances } = await load()
    const ms = F.months(2030, 12, 2031, 2)
    const head = ['Deskripsi', ...ms.map(m => `${m.label} (IDR)`), 'Total (IDR)']
    expect([head, ...F.profitLossColumns(accounts, balances, ms, o).map(F.formatMulti)]).toEqual(fs.ProfitLossMultiPeriodReport.rows)
  })

  test('Laba/Rugi (Multi Year) per 2031: three fiscal years', async () => {
    const { accounts, balances } = await load()
    const ys = [2029, 2030, 2031].map(y => ({ from: `${y}-01-01`, to: `${y}-12-31` }))
    const head = ['Deskripsi', '2029 (IDR)', '2030 (IDR)', '2031 (IDR)', 'Total (IDR)']
    expect([head, ...F.profitLossColumns(accounts, balances, ys, o).map(F.formatMulti)]).toEqual(fs.ProfitLossMultiYearReport.rows)
  })

  test('Laba/Rugi (Perbandingan Periode) Jan vs Feb 2031', async () => {
    const { accounts, balances } = await load()
    const p = (from: string, to: string) => F.profitLoss(accounts, balances, from, to, { ...o, showZeroBalance: true })
    const head = ['Deskripsi', F.periodLabel('2031-01-01', '2031-01-31'), F.periodLabel('2031-02-01', '2031-02-28'), 'Variance', '% Var.']
    expect([head, ...F.compareColumns(p('2031-01-01', '2031-01-31'), p('2031-02-01', '2031-02-28'), o).map(F.formatMulti)]).toEqual(fs.ProfitLossComparePeriodReport.rows)
  })

  test('Neraca (Multi Periode) month ends Des 2030 – Feb 2031', async () => {
    const { accounts, balances, settings } = await load()
    const ends = F.months(2030, 12, 2031, 2).map(m => m.to)
    expect(['Deskripsi', ...ends.map(d => `${Number(d.slice(8))} ${F.MONTHS[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)} (IDR)`)]).toEqual(fs.BalanceSheetMultiPeriodReport.header)
    const rows = F.balanceSheetColumns(accounts, balances, settings, ends, o).map(F.formatMulti).filter(r => /^NL-T1|^Laba /.test(r[0]!))
    // Laba Ditahan: sandbox carries 34.002.596 D of unrelated history
    const exp = fs.BalanceSheetMultiPeriodReport.rows.map(r => r[0] === 'Laba Ditahan' ? ['Laba Ditahan', '0', '3.000.000', '3.000.000'] : r)
    expect(rows).toEqual(exp)
  })
})

describe('Account aggregate', () => {
  test('rename projects; suspended account rejects postings; duplicate and orphan rejected', async () => {
    await handle(db, { type: 'OpenAccount', idempotencyKey: 'acct-x-parent', no: 'NL-X-1', name: 'Induk', accountType: 'EXPENSE' })
    await handle(db, { type: 'OpenAccount', idempotencyKey: 'acct-x-child', no: 'NL-X-11', name: 'Anak', accountType: 'EXPENSE', parentNo: 'NL-X-1' })
    await expect(handle(db, { type: 'OpenAccount', idempotencyKey: 'acct-x-dup', no: 'NL-X-1', name: 'Lagi', accountType: 'EXPENSE' })).rejects.toThrow('sudah ada')
    await expect(handle(db, { type: 'OpenAccount', idempotencyKey: 'acct-x-orphan', no: 'NL-X-2', name: 'Yatim', accountType: 'EXPENSE', parentNo: 'NOPE' })).rejects.toThrow('induk')
    await handle(db, { type: 'RenameAccount', idempotencyKey: 'acct-x-rename', no: 'NL-X-11', name: 'Anak Baru' })
    await handle(db, { type: 'SuspendAccount', idempotencyKey: 'acct-x-suspend', no: 'NL-X-11' })
    await catchUp(db, ledgerProjection)
    const [row] = await db.execute(sql`SELECT name, parent_no, suspended FROM accounts WHERE no = 'NL-X-11'`)
    expect(row).toEqual({ name: 'Anak Baru', parent_no: 'NL-X-1', suspended: true })
    const audit = await db.execute(sql`SELECT op FROM accounts_audit WHERE account_no = 'NL-X-11' ORDER BY id`)
    expect(audit.map(r => r.op)).toEqual(['INSERT', 'UPDATE', 'UPDATE'])
    await expect(handle(db, { type: 'PostJournal', idempotencyKey: 'acct-x-post', journalId: crypto.randomUUID(), date: '2031-07-01',
      lines: [{ account: 'NL-X-11', side: 'DEBIT', amount: '1' }, { account: 'NL-T1-1101', side: 'CREDIT', amount: '1' }] })).rejects.toThrow('nonaktif')
  })
})
