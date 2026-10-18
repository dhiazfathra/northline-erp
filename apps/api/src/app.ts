import { Hono } from 'hono'
import { ZodError } from 'zod'
import { balanceSheetQuery, trialBalanceQuery } from '@northline/schemas/ledger-es'
import type { Db } from './db'
import { ConcurrencyError } from './es/store'
import { handle } from './ledger/handler'
import { DomainError } from './ledger/deciders'
import { waitFor } from './projections'
import { queryBalanceSheet, queryGeneralLedger, queryProfitLoss, queryTrialBalance, type GlReport } from './reports/queries'

export function createApp(db: Db) {
  const api = new Hono()
    .onError((err, c) => {
      if (err instanceof ZodError) return c.json({ error: 'validation', issues: err.issues }, 422)
      if (err instanceof DomainError) return c.json({ error: err.message }, 409)
      if (err instanceof ConcurrencyError) return c.json({ error: err.message }, 409)
      console.error(err)
      return c.json({ error: 'internal' }, 500)
    })
    .post('/ledger/commands', async c => {
      // handle() owns parsing (amounts → cents); parsing here too would convert twice
      const result = await handle(db, await c.req.json(), { requestId: c.req.header('x-request-id') })
      return c.json(result, 202)
    })
    .get('/reports/trial-balance', async c => {
      const q = trialBalanceQuery.parse(c.req.query())
      const after = Number(c.req.query('after') ?? 0)
      if (after) await waitFor(db, after)
      return c.json(await queryTrialBalance(db, q))
    })
    .get('/reports/profit-loss', async c => c.json(await queryProfitLoss(db, trialBalanceQuery.parse(c.req.query()))))
    .get('/reports/general-ledger/:report{journal-list|all-journals|history|summary|detail}', async c =>
      c.json(await queryGeneralLedger(db, c.req.param('report') as GlReport, trialBalanceQuery.parse(c.req.query()))))
    .get('/reports/balance-sheet', async c => c.json(await queryBalanceSheet(db, balanceSheetQuery.parse(c.req.query()))))
  return new Hono().route('/api', api)
}

export type AppType = ReturnType<typeof createApp>
