import type { JournalLine, LedgerEvent } from '@northline/schemas/ledger-es'
import type { Decider } from '../es/store'

export class DomainError extends Error {}

type PostCmd = { type: 'Post'; journalId: string; number?: string; sourceType?: 'JV' | 'SI' | 'SR' | 'PI' | 'PP'; date: string; description: string; lines: JournalLine[]; reverses?: string; periodClosed: boolean }
type ReverseCmd = { type: 'Reverse'; reversalJournalId: string; date: string; reason: string }

export type JournalState =
  | { status: 'none' }
  | { status: 'posted' | 'reversed'; journalId: string; date: string; lines: JournalLine[] }

export const journalDecider: Decider<JournalState, PostCmd | ReverseCmd, LedgerEvent> = {
  initial: { status: 'none' },
  evolve(s, e) {
    if (e.type === 'JournalPosted') return { status: 'posted', journalId: e.data.journalId, date: e.data.date, lines: e.data.lines }
    if (e.type === 'JournalReversed' && s.status !== 'none') return { ...s, status: 'reversed' }
    return s
  },
  decide(s, c) {
    if (c.type === 'Post') {
      if (s.status !== 'none') throw new DomainError(`Jurnal ${c.journalId} sudah diposting`)
      if (c.periodClosed) throw new DomainError(`Periode ${c.date.slice(0, 7)} sudah ditutup`)
      const debit = c.lines.filter(l => l.side === 'DEBIT').reduce((a, l) => a + l.amount, 0)
      const credit = c.lines.filter(l => l.side === 'CREDIT').reduce((a, l) => a + l.amount, 0)
      if (debit !== credit) throw new DomainError(`Debit (${debit}) dan kredit (${credit}) tidak seimbang`)
      if (debit === 0) throw new DomainError('Jurnal tanpa nilai')
      return [{ type: 'JournalPosted', data: { journalId: c.journalId, number: c.number, sourceType: c.sourceType ?? 'JV', date: c.date, description: c.description, lines: c.lines, reverses: c.reverses } }]
    }
    if (s.status === 'none') throw new DomainError('Jurnal tidak ditemukan')
    if (s.status === 'reversed') throw new DomainError(`Jurnal ${s.journalId} sudah dibalik`)
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
export type AccountState = { status: 'none' } | { status: 'open' | 'suspended'; no: string; name: string }

export const accountDecider: Decider<AccountState, AccountCmd, LedgerEvent> = {
  initial: { status: 'none' },
  evolve(s, e) {
    if (e.type === 'AccountOpened') return { status: 'open', no: e.data.no, name: e.data.name }
    if (s.status === 'none') return s
    if (e.type === 'AccountRenamed') return { ...s, name: e.data.name }
    if (e.type === 'AccountSuspended') return { ...s, status: 'suspended' }
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
    if (s.status === 'suspended') throw new DomainError(`Akun ${s.no} sudah nonaktif`)
    return [{ type: 'AccountSuspended', data: { no: s.no } }]
  },
}
export const accountStream = (no: string) => `account-${no}`
