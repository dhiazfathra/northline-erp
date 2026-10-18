import type { JournalLine, LedgerEvent } from '@northline/schemas/ledger-es'
import type { Decider } from '../es/store'

export class DomainError extends Error {}

type PostCmd = { type: 'Post'; journalId: string; number?: string; sourceType?: 'JV' | 'SI' | 'SR' | 'PI' | 'PP' | 'FA' | 'PE' | 'SRT' | 'PRT' | 'SDP' | 'PDP' | 'IA' | 'FAD' | 'DO' | 'OP' | 'OD' | 'RI' | 'EXP'; branch?: string; date: string; description: string; lines: JournalLine[]; reverses?: string; periodClosed: boolean }
type ReverseCmd = { type: 'Reverse'; reversalJournalId: string; date: string; reason: string }
type EditCmd = { type: 'Edit'; number?: string; branch?: string; date: string; description: string; lines: JournalLine[]; periodClosed: boolean }
type DeleteCmd = { type: 'Delete'; periodClosed: boolean }

export type JournalState =
  | { status: 'none' }
  | { status: 'posted' | 'reversed' | 'deleted'; journalId: string; number?: string; branch?: string; sourceType: string; date: string; lines: JournalLine[] }

const balance = (lines: JournalLine[]) => {
  const debit = lines.filter(l => l.side === 'DEBIT').reduce((a, l) => a + l.amount, 0)
  const credit = lines.filter(l => l.side === 'CREDIT').reduce((a, l) => a + l.amount, 0)
  if (debit !== credit) throw new DomainError(`Debit (${debit}) dan kredit (${credit}) tidak seimbang`)
  if (debit === 0) throw new DomainError('Jurnal tanpa nilai')
}

export const journalDecider: Decider<JournalState, PostCmd | ReverseCmd | EditCmd | DeleteCmd, LedgerEvent> = {
  initial: { status: 'none' },
  evolve(s, e) {
    if (e.type === 'JournalPosted') return { status: 'posted', journalId: e.data.journalId, number: e.data.number, branch: e.data.branch, sourceType: e.data.sourceType ?? 'JV', date: e.data.date, lines: e.data.lines }
    if (s.status === 'none') return s
    if (e.type === 'JournalReversed') return { ...s, status: 'reversed' }
    if (e.type === 'JournalEdited') return { ...s, number: e.data.number, branch: e.data.branch, date: e.data.date, lines: e.data.lines }
    if (e.type === 'JournalDeleted') return { ...s, status: 'deleted' }
    return s
  },
  decide(s, c) {
    if (c.type === 'Post') {
      if (s.status !== 'none') throw new DomainError(`Jurnal ${c.journalId} sudah diposting`)
      if (c.periodClosed) throw new DomainError(`Periode ${c.date.slice(0, 7)} sudah ditutup`)
      balance(c.lines)
      return [{ type: 'JournalPosted', data: { journalId: c.journalId, number: c.number, branch: c.branch, sourceType: c.sourceType ?? 'JV', date: c.date, description: c.description, lines: c.lines, reverses: c.reverses } }]
    }
    if (s.status === 'none' || s.status === 'deleted') throw new DomainError('Jurnal tidak ditemukan')
    if (s.status === 'reversed') throw new DomainError(`Jurnal ${s.journalId} sudah dibalik`)
    // Edit and delete must not touch a closed period, neither the journal's current date nor an edit's new one.
    if (c.type === 'Edit' || c.type === 'Delete') {
      if (c.periodClosed) throw new DomainError(`Periode jurnal ${s.number ?? s.journalId} sudah ditutup`)
      if (c.type === 'Delete') return [{ type: 'JournalDeleted', data: { journalId: s.journalId } }]
      balance(c.lines)
      return [{ type: 'JournalEdited', data: { journalId: s.journalId, number: c.number ?? s.number, branch: c.branch, date: c.date, description: c.description, lines: c.lines } }]
    }
    return [{ type: 'JournalReversed', data: { journalId: s.journalId, reversalJournalId: c.reversalJournalId, date: c.date, reason: c.reason } }]
  },
}

export type PeriodState = { closed: boolean }
export const periodDecider: Decider<PeriodState, { type: 'Close' | 'Reopen'; period: string }, LedgerEvent> = {
  initial: { closed: false },
  evolve(s, e) {
    if (e.type === 'PeriodClosed') return { closed: true }
    if (e.type === 'PeriodReopened') return { closed: false }
    return s
  },
  decide(s, c) {
    if (c.type === 'Close') {
      if (s.closed) throw new DomainError(`Periode ${c.period} sudah ditutup`)
      return [{ type: 'PeriodClosed', data: { period: c.period } }]
    }
    if (!s.closed) throw new DomainError(`Periode ${c.period} belum ditutup`)
    return [{ type: 'PeriodReopened', data: { period: c.period } }]
  },
}

/** Lines that undo `lines`: same accounts and amounts, sides swapped. */
export const reverseLines = (lines: JournalLine[]): JournalLine[] =>
  lines.map(l => ({ ...l, side: l.side === 'DEBIT' ? 'CREDIT' : 'DEBIT' }))

export const journalStream = (id: string) => `journal-${id}`
export const periodStream = (period: string) => `period-${period}`

type AccountCmd =
  | { type: 'Open'; no: string; name: string; accountType: string; parentNo?: string; parentExists: boolean }
  | { type: 'Rename'; name: string }
  | { type: 'Suspend' }
  | { type: 'Delete'; used: boolean }
export type AccountState = { status: 'none' } | { status: 'open' | 'suspended'; no: string; name: string }

export const accountDecider: Decider<AccountState, AccountCmd, LedgerEvent> = {
  initial: { status: 'none' },
  evolve(s, e) {
    if (e.type === 'AccountOpened') return { status: 'open', no: e.data.no, name: e.data.name }
    if (s.status === 'none') return s
    if (e.type === 'AccountRenamed') return { ...s, name: e.data.name }
    if (e.type === 'AccountSuspended') return { ...s, status: 'suspended' }
    if (e.type === 'AccountDeleted') return { status: 'none' }
    return s
  },
  decide(s, c) {
    if (c.type === 'Open') {
      if (s.status !== 'none') throw new DomainError(`Akun ${c.no} sudah ada`)
      if (c.parentNo && !c.parentExists) throw new DomainError(`Akun induk ${c.parentNo} tidak ditemukan`)
      return [{ type: 'AccountOpened', data: { no: c.no, name: c.name, accountType: c.accountType as any, parentNo: c.parentNo } }]
    }
    if (s.status === 'none') throw new DomainError('Akun tidak ditemukan')
    if (c.type === 'Rename') return s.name === c.name ? [] : [{ type: 'AccountRenamed', data: { no: s.no, name: c.name } }]
    if (c.type === 'Delete') {
      if (c.used) throw new DomainError(`Akun ${s.no} sudah dipakai`)
      return [{ type: 'AccountDeleted', data: { no: s.no } }]
    }
    if (s.status === 'suspended') throw new DomainError(`Akun ${s.no} sudah nonaktif`)
    return [{ type: 'AccountSuspended', data: { no: s.no } }]
  },
}
export const accountStream = (no: string) => `account-${no}`
