import { sql } from 'drizzle-orm'
import { ledgerCommand, type LedgerCommandInput } from '@northline/schemas/ledger-es'
import type { Db, Tx } from '../db'
import { append, load, maybeSnapshot } from '../es/store'
import { accountDecider, accountStream, DomainError, journalDecider, journalStream, periodDecider, periodStream, reverseLines } from './deciders'

export interface CommandResult { globalPosition: number; streams: string[] }

/**
 * Validates and executes one ledger command in a single transaction: decide → append (+outbox) → store result
 * under the idempotency key. Replaying the same key returns the first result without new events.
 */
export async function handle(db: Db, input: LedgerCommandInput, metadata: Record<string, unknown> = {}): Promise<CommandResult> {
  return db.transaction(tx => handleTx(tx, input, metadata))
}

/** Same as handle() inside the caller's transaction, so a document and its journal commit together. */
export async function handleTx(tx: Tx, input: LedgerCommandInput, metadata: Record<string, unknown> = {}): Promise<CommandResult> {
  const cmd = ledgerCommand.parse(input)
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${cmd.idempotencyKey}))`)
  const [prev] = await tx.execute(sql`SELECT result FROM command_results WHERE idempotency_key = ${cmd.idempotencyKey}`)
  if (prev) return prev.result as CommandResult

  const meta = { ...metadata, commandType: cmd.type, idempotencyKey: cmd.idempotencyKey }
  let result: CommandResult
  switch (cmd.type) {
    case 'PostJournal': {
      const unknown = await unknownAccounts(tx, cmd.lines.map(l => l.account))
      if (unknown.length) throw new DomainError(`Akun tidak dikenal: ${unknown.join(', ')}`)
      for (const no of new Set(cmd.lines.map(l => l.account)))
        if ((await load(tx, accountStream(no), accountDecider)).state.status === 'suspended') throw new DomainError(`Akun ${no} nonaktif`)
      const { type: _, idempotencyKey: __, ...post_ } = cmd
      result = await post(tx, { ...post_, periodClosed: await isClosed(tx, cmd.date) }, meta)
      break
    }
    case 'ReverseJournal': {
      const sid = journalStream(cmd.journalId)
      const { state, version } = await load(tx, sid, journalDecider)
      const evs = journalDecider.decide(state, { type: 'Reverse', reversalJournalId: cmd.reversalJournalId, date: cmd.date, reason: cmd.reason })
      await append(tx, sid, version, evs.map(e => ({ ...e, metadata: meta })))
      if (state.status === 'none') throw new DomainError('unreachable')
      // The correction is a new journal in an open period; the original stays untouched.
      result = await post(tx, {
        journalId: cmd.reversalJournalId, date: cmd.date, description: `Pembalik ${state.journalId}${cmd.reason ? ': ' + cmd.reason : ''}`,
        lines: reverseLines(state.lines), reverses: state.journalId, periodClosed: await isClosed(tx, cmd.date),
      }, meta)
      result.streams.unshift(sid)
      break
    }
    case 'OpenAccount':
    case 'RenameAccount':
    case 'SuspendAccount': {
      const sid = accountStream(cmd.no)
      const { state, version } = await load(tx, sid, accountDecider)
      const c = cmd.type === 'OpenAccount'
        ? { type: 'Open' as const, no: cmd.no, name: cmd.name, accountType: cmd.accountType, parentNo: cmd.parentNo,
            parentExists: !cmd.parentNo || (await load(tx, accountStream(cmd.parentNo), accountDecider)).state.status !== 'none' }
        : cmd.type === 'RenameAccount' ? { type: 'Rename' as const, name: cmd.name } : { type: 'Suspend' as const }
      const evs = accountDecider.decide(state, c)
      const stored = await append(tx, sid, version, evs.map(e => ({ ...e, metadata: meta })))
      result = { globalPosition: stored.at(-1)?.globalPosition ?? 0, streams: [sid] }
      break
    }
    case 'ClosePeriod':
    case 'ReopenPeriod': {
      const sid = periodStream(cmd.period)
      const { state, version } = await load(tx, sid, periodDecider)
      const evs = periodDecider.decide(state, { type: cmd.type === 'ClosePeriod' ? 'Close' : 'Reopen', period: cmd.period })
      const stored = await append(tx, sid, version, evs.map(e => ({ ...e, metadata: meta })))
      await maybeSnapshot(tx, sid, version + evs.length, evs.reduce(periodDecider.evolve, state))
      result = { globalPosition: stored.at(-1)!.globalPosition, streams: [sid] }
      break
    }
  }
  await tx.execute(sql`INSERT INTO command_results (idempotency_key, command_type, result) VALUES (${cmd.idempotencyKey}, ${cmd.type}, ${JSON.stringify(result)}::jsonb)`)
  return result
}

type PostInput = Omit<Extract<Parameters<typeof journalDecider.decide>[1], { type: 'Post' }>, 'type'>

async function post(tx: Tx, c: PostInput, meta: Record<string, unknown>): Promise<CommandResult> {
  const sid = journalStream(c.journalId)
  const { state, version } = await load(tx, sid, journalDecider)
  const number = c.number ?? (state.status === 'none' ? await nextNumber(tx, c.date) : undefined)
  const evs = journalDecider.decide(state, { ...c, number, type: 'Post' })
  const stored = await append(tx, sid, version, evs.map(e => ({ ...e, metadata: meta })))
  return { globalPosition: stored.at(-1)!.globalPosition, streams: [sid] }
}

async function isClosed(tx: Tx, date: string) {
  const { state } = await load(tx, periodStream(date.slice(0, 7)), periodDecider)
  return state.closed
}

async function unknownAccounts(tx: Tx, nos: string[]) {
  const want = [...new Set(nos)]
  const rows = await tx.execute(sql`SELECT no FROM accounts WHERE no IN ${want}`)
  const have = new Set(rows.map(r => r.no as string))
  return want.filter(n => !have.has(n))
}

/** JV.yyyy.mm.nnnnn, sequence per month (Accurate's default auto-number for Jurnal Umum). */
async function nextNumber(tx: Tx, date: string) {
  const prefix = `JV.${date.slice(0, 4)}.${date.slice(5, 7)}.`
  const [r] = await tx.execute(sql`INSERT INTO number_sequences (prefix, last) VALUES (${prefix}, 1)
    ON CONFLICT (prefix) DO UPDATE SET last = number_sequences.last + 1 RETURNING last`)
  return prefix + String(r!.last).padStart(5, '0')
}
