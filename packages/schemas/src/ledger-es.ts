import { z } from 'zod'

// Contracts for the event-sourced ledger (ADR-0001). Amounts travel as integer cents (minor units) so
// debit = credit is exact; the API accepts decimal strings/numbers and converts at the boundary.

export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal harus YYYY-MM-DD')
export const periodId = z.string().regex(/^\d{4}-\d{2}$/, 'Periode harus YYYY-MM')
export const side = z.enum(['DEBIT', 'CREDIT'])
export const cents = z.number().int().positive()

/** Decimal amount (max 2 places) → integer cents. */
export const amountToCents = z
  .union([z.number(), z.string()])
  .transform(v => String(v).trim())
  .refine(v => /^\d+(\.\d{1,2})?$/.test(v), 'Nilai maksimal 2 desimal')
  .transform(v => {
    const [i, f = ''] = v.split('.')
    return Number(i) * 100 + Number(f.padEnd(2, '0'))
  })
  .pipe(cents)

export const journalSource = z.enum(['JV', 'SI', 'SR', 'PI', 'PP', 'FA', 'PE', 'SRT', 'PRT', 'SDP', 'PDP', 'IA', 'FAD', 'DO', 'OP', 'OD', 'RI', 'EXP', 'JC', 'RO'])
export type JournalSource = z.infer<typeof journalSource>

/** department / project: optional dimensions per line (ADR-0022); names of master rows. */
export const journalLine = z.object({ account: z.string().min(1), side, amount: cents, memo: z.string().optional(), department: z.string().optional(), project: z.string().optional() })
export type JournalLine = z.infer<typeof journalLine>

// ---- commands ----
const commandBase = { idempotencyKey: z.string().min(8) }

export const postJournalCommand = z.object({
  ...commandBase,
  type: z.literal('PostJournal'),
  journalId: z.string().uuid(),
  number: z.string().optional(),
  /** Document that produced the journal (JV = Jurnal Umum entered directly). */
  sourceType: journalSource.default('JV'),
  /** Cabang; absent = the default branch (ADR-0022). */
  branch: z.string().optional(),
  date: isoDate,
  description: z.string().default(''),
  lines: z.array(journalLine.extend({ amount: amountToCents })).min(2),
})
export const reverseJournalCommand = z.object({
  ...commandBase,
  type: z.literal('ReverseJournal'),
  journalId: z.string().uuid(),
  reversalJournalId: z.string().uuid(),
  date: isoDate,
  reason: z.string().default(''),
})
/** Jurnal Umum edited in place (Accurate keeps one document): full replacement of number, date, description and lines. */
export const editJournalCommand = z.object({
  ...commandBase,
  type: z.literal('EditJournal'),
  journalId: z.string().uuid(),
  number: z.string().optional(),
  branch: z.string().optional(),
  date: isoDate,
  description: z.string().default(''),
  lines: z.array(journalLine.extend({ amount: amountToCents })).min(2),
})
export const deleteJournalCommand = z.object({ ...commandBase, type: z.literal('DeleteJournal'), journalId: z.string().uuid() })
export const closePeriodCommand = z.object({ ...commandBase, type: z.literal('ClosePeriod'), period: periodId })
export const reopenPeriodCommand = z.object({ ...commandBase, type: z.literal('ReopenPeriod'), period: periodId })

export const accountType = z.enum([
  'CASH_BANK', 'ACCOUNT_RECEIVABLE', 'INVENTORY', 'OTHER_CURRENT_ASSET', 'FIXED_ASSET', 'ACCUMULATED_DEPRECIATION', 'OTHER_ASSET',
  'ACCOUNT_PAYABLE', 'OTHER_CURRENT_LIABILITY', 'LONG_TERM_LIABILITY', 'EQUITY', 'REVENUE', 'COGS', 'EXPENSE', 'OTHER_INCOME', 'OTHER_EXPENSE',
])
const accountNo = z.string().trim().min(1).max(40)
export const openAccountCommand = z.object({ ...commandBase, type: z.literal('OpenAccount'), no: accountNo, name: z.string().trim().min(1), accountType, parentNo: accountNo.optional() })
export const renameAccountCommand = z.object({ ...commandBase, type: z.literal('RenameAccount'), no: accountNo, name: z.string().trim().min(1) })
export const suspendAccountCommand = z.object({ ...commandBase, type: z.literal('SuspendAccount'), no: accountNo })
export const deleteAccountCommand = z.object({ ...commandBase, type: z.literal('DeleteAccount'), no: accountNo })

export const ledgerCommand = z.discriminatedUnion('type', [
  openAccountCommand,
  renameAccountCommand,
  suspendAccountCommand,
  deleteAccountCommand,
  postJournalCommand,
  reverseJournalCommand,
  editJournalCommand,
  deleteJournalCommand,
  closePeriodCommand,
  reopenPeriodCommand,
])
export type LedgerCommand = z.output<typeof ledgerCommand>
export type LedgerCommandInput = z.input<typeof ledgerCommand>

// ---- events (payloads; envelope lives in the store) ----
export const journalPosted = z.object({
  journalId: z.string(),
  number: z.string().optional(),
  /** Absent on events written before branches existed; read as the default branch. */
  branch: z.string().optional(),
  date: isoDate,
  description: z.string(),
  lines: z.array(journalLine).min(2),
  /** Absent on events written before source types existed; read as 'JV'. */
  sourceType: journalSource.optional(),
  /** Set when this journal is the reversal of another. */
  reverses: z.string().optional(),
})
export const journalReversed = z.object({ journalId: z.string(), reversalJournalId: z.string(), date: isoDate, reason: z.string() })
export const journalEdited = z.object({ journalId: z.string(), number: z.string().optional(), branch: z.string().optional(), date: isoDate, description: z.string(), lines: z.array(journalLine).min(2) })
export const journalDeleted = z.object({ journalId: z.string() })
export const periodClosed = z.object({ period: periodId })
export const periodReopened = z.object({ period: periodId })

export const accountOpened = z.object({ no: z.string(), name: z.string(), accountType, parentNo: z.string().optional() })
export const accountRenamed = z.object({ no: z.string(), name: z.string() })
export const accountSuspended = z.object({ no: z.string() })
export const accountDeleted = z.object({ no: z.string() })

export const ledgerEvent = z.discriminatedUnion('type', [
  z.object({ type: z.literal('AccountOpened'), data: accountOpened }),
  z.object({ type: z.literal('AccountRenamed'), data: accountRenamed }),
  z.object({ type: z.literal('AccountSuspended'), data: accountSuspended }),
  z.object({ type: z.literal('AccountDeleted'), data: accountDeleted }),
  z.object({ type: z.literal('JournalPosted'), data: journalPosted }),
  z.object({ type: z.literal('JournalReversed'), data: journalReversed }),
  z.object({ type: z.literal('JournalEdited'), data: journalEdited }),
  z.object({ type: z.literal('JournalDeleted'), data: journalDeleted }),
  z.object({ type: z.literal('PeriodClosed'), data: periodClosed }),
  z.object({ type: z.literal('PeriodReopened'), data: periodReopened }),
])
export type LedgerEvent = z.infer<typeof ledgerEvent>

// ---- DTOs ----
export const trialBalanceQuery = z.object({
  from: isoDate,
  to: isoDate,
  showZeroBalance: z.union([z.boolean(), z.stringbool()]).default(false),
  showParentAccount: z.union([z.boolean(), z.stringbool()]).default(true),
})
export type TrialBalanceQuery = z.infer<typeof trialBalanceQuery>

export const balanceSheetQuery = z.object({
  asOf: isoDate,
  showZeroBalance: z.union([z.boolean(), z.stringbool()]).default(false),
  showParentAccount: z.union([z.boolean(), z.stringbool()]).default(true),
})
export type BalanceSheetQuery = z.infer<typeof balanceSheetQuery>

/** One trial-balance row; amounts in cents, net columns already split to one side. */
export const trialBalanceRow = z.object({
  no: z.string(),
  name: z.string(),
  depth: z.number().int(),
  isParent: z.boolean(),
  openingDebit: z.number().int(),
  openingCredit: z.number().int(),
  debit: z.number().int(),
  credit: z.number().int(),
  closingDebit: z.number().int(),
  closingCredit: z.number().int(),
})
export type TrialBalanceRow = z.infer<typeof trialBalanceRow>
