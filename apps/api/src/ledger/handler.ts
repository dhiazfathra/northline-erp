import { sql } from 'drizzle-orm'
import { ledgerCommand, type LedgerCommandInput } from '@northline/schemas/ledger-es'
import type { Db, Tx } from '../db'
import { append, load, maybeSnapshot } from '../es/store'
import { accountDecider, accountStream, DomainError, journalDecider, journalStream, periodDecider, periodStream, reverseLines } from './deciders'
import { logActivity, type Activity } from '../activity/log'

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
  // Log Aktifitas rows come from the command's metadata (ADR-0019); journals of other documents are logged by those documents.
  const log = (a: Activity) => logActivity(tx, a, { userId: (metadata.userId as number | undefined) ?? null, ip: (metadata.ip as string | undefined) ?? null })
  let result: CommandResult
  switch (cmd.type) {
    case 'PostJournal': {
      await checkAccounts(tx, cmd.lines.map(l => l.account))
      await checkDimensions(tx, cmd.branch, cmd.lines)
      const { type: _, idempotencyKey: __, ...post_ } = cmd
      const posted = await post(tx, { ...post_, periodClosed: await isClosed(tx, cmd.date) }, meta)
      if (cmd.sourceType === 'JV') await log({ action: 'CREATE', entity: 'JV', reference: posted.number, docDate: cmd.date })
      result = { globalPosition: posted.globalPosition, streams: posted.streams }
      break
    }
    case 'EditJournal':
    case 'DeleteJournal': {
      const sid = journalStream(cmd.journalId)
      const { state, version } = await load(tx, sid, journalDecider)
      if (state.status === 'none') throw new DomainError('Jurnal tidak ditemukan')
      const evs = cmd.type === 'DeleteJournal'
        ? journalDecider.decide(state, { type: 'Delete', periodClosed: await isClosed(tx, state.date) })
        : (await checkAccounts(tx, cmd.lines.map(l => l.account)), await checkDimensions(tx, cmd.branch, cmd.lines), journalDecider.decide(state, {
            type: 'Edit', number: cmd.number, branch: cmd.branch, date: cmd.date, description: cmd.description, lines: cmd.lines,
            periodClosed: (await isClosed(tx, state.date)) || (await isClosed(tx, cmd.date)) }))
      const stored = await append(tx, sid, version, evs.map(e => ({ ...e, metadata: meta })))
      const e = evs[0]!
      if (state.sourceType === 'JV') await log(e.type === 'JournalEdited'
        ? { action: 'UPDATE', entity: 'JV', reference: e.data.number ?? '', docDate: e.data.date }
        : { action: 'DELETE', entity: 'JV', reference: state.number ?? '', docDate: state.date })
      result = { globalPosition: stored.at(-1)!.globalPosition, streams: [sid] }
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
        lines: reverseLines(state.lines), reverses: state.journalId, branch: state.branch, periodClosed: await isClosed(tx, cmd.date),
      }, meta)
      result.streams.unshift(sid)
      break
    }
    case 'OpenAccount':
    case 'RenameAccount':
    case 'SuspendAccount':
    case 'DeleteAccount': {
      const sid = accountStream(cmd.no)
      const { state, version } = await load(tx, sid, accountDecider)
      const c = cmd.type === 'OpenAccount'
        ? { type: 'Open' as const, no: cmd.no, name: cmd.name, accountType: cmd.accountType, parentNo: cmd.parentNo,
            parentExists: !cmd.parentNo || (await load(tx, accountStream(cmd.parentNo), accountDecider)).state.status !== 'none' }
        : cmd.type === 'RenameAccount' ? { type: 'Rename' as const, name: cmd.name }
        : cmd.type === 'DeleteAccount' ? { type: 'Delete' as const, used: await accountUsed(tx, cmd.no) } : { type: 'Suspend' as const }
      const evs = accountDecider.decide(state, c)
      const stored = await append(tx, sid, version, evs.map(e => ({ ...e, metadata: meta })))
      // Accurate's reference for an account is its name (after the change for an edit).
      const name = cmd.type === 'OpenAccount' || cmd.type === 'RenameAccount' ? cmd.name : state.status === 'none' ? cmd.no : state.name
      if (evs.length) await log({ action: cmd.type === 'OpenAccount' ? 'CREATE' : cmd.type === 'DeleteAccount' ? 'DELETE' : 'UPDATE', entity: 'ACC', reference: name })
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

async function post(tx: Tx, c: PostInput, meta: Record<string, unknown>): Promise<CommandResult & { number: string }> {
  const sid = journalStream(c.journalId)
  const { state, version } = await load(tx, sid, journalDecider)
  const number = c.number ?? (state.status === 'none' ? await nextNumber(tx, c.date) : undefined)
  const evs = journalDecider.decide(state, { ...c, number, type: 'Post' })
  const stored = await append(tx, sid, version, evs.map(e => ({ ...e, metadata: meta })))
  return { globalPosition: stored.at(-1)!.globalPosition, streams: [sid], number: number ?? '' }
}

async function isClosed(tx: Tx, date: string) {
  const { state } = await load(tx, periodStream(date.slice(0, 7)), periodDecider)
  return state.closed
}

/** Every line account must exist and be active. */
async function checkAccounts(tx: Tx, nos: string[]) {
  const unknown = await unknownAccounts(tx, nos)
  if (unknown.length) throw new DomainError(`Akun tidak dikenal: ${unknown.join(', ')}`)
  for (const no of new Set(nos))
    if ((await load(tx, accountStream(no), accountDecider)).state.status === 'suspended') throw new DomainError(`Akun ${no} nonaktif`)
}

/** Branch, departments and projects must be master rows (ADR-0022). */
async function checkDimensions(tx: Tx, branch: string | undefined, lines: { department?: string; project?: string }[]) {
  const check = async (table: string, names: (string | undefined)[], label: string) => {
    const want = [...new Set(names.filter((n): n is string => !!n))]
    if (!want.length) return
    const have = new Set((await tx.execute(sql`SELECT name FROM ${sql.identifier(table)} WHERE name IN ${want}`)).map(r => r.name as string))
    const missing = want.filter(n => !have.has(n))
    if (missing.length) throw new DomainError(`${label} tidak dikenal: ${missing.join(', ')}`)
  }
  await check('branches', [branch], 'Cabang')
  await check('departments', lines.map(l => l.department), 'Departemen')
  await check('projects', lines.map(l => l.project), 'Proyek')
}

/** An account referenced by any row (journal lines, sub-accounts, master data) cannot be deleted. */
async function accountUsed(tx: Tx, no: string) {
  const refs = await tx.execute(sql`SELECT c.conrelid::regclass::text AS t, a.attname AS col FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey) WHERE c.contype = 'f' AND c.confrelid = 'accounts'::regclass`)
  for (const r of refs) {
    const [hit] = await tx.execute(sql`SELECT 1 FROM ${sql.identifier(r.t as string)} WHERE ${sql.identifier(r.col as string)} = ${no} LIMIT 1`)
    if (hit) return true
  }
  return false
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
