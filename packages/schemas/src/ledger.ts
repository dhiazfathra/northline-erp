import { z } from 'zod'

export const tbAccountSchema = z.object({
  code: z.string(),
  name: z.string(),
  /** Signed opening balance: positive = debit. */
  opening: z.number(),
  debit: z.number(),
  credit: z.number(),
})
export type TbAccount = z.infer<typeof tbAccountSchema>

export const journalAdjustSchema = z.object({
  side: z.enum(['debit', 'credit']),
  amount: z.string().trim().min(1, 'Nilai harus diisi'),
  note: z.string(),
})
export type JournalAdjustInput = z.infer<typeof journalAdjustSchema>

export const bankEntrySchema = z.object({
  id: z.string(),
  date: z.string(),
  side: z.enum(['debit', 'credit']),
  amount: z.number(),
  type: z.string(),
  no: z.string(),
  party: z.string().optional(),
  method: z.string().optional(),
  matched: z.boolean(),
})
export type BankEntry = z.infer<typeof bankEntrySchema>

export const bankSchema = z.object({ name: z.string(), balance: z.number(), entries: z.array(bankEntrySchema) })
export type Bank = z.infer<typeof bankSchema>

export const monthEndSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int(),
  usdRate: z.string().trim().min(1, 'Nilai tukar US Dollar harus diisi'),
})
export type MonthEndInput = z.infer<typeof monthEndSchema>

export const monthEndRunSchema = z.object({ name: z.string(), date: z.string(), note: z.string() })
export type MonthEndRun = z.infer<typeof monthEndRunSchema>

export const featureSchema = z.object({
  id: z.string(),
  group: z.string(),
  name: z.string(),
  on: z.boolean(),
  /** Monthly price in IDR; activating asks for confirmation. */
  price: z.number().optional(),
  lockedNote: z.string().optional(),
  /** Turning it off deletes related settings; asks for confirmation. */
  hasData: z.boolean().optional(),
})
export type Feature = z.infer<typeof featureSchema>

export const defaultAccountSchema = z.object({ label: z.string(), value: z.string() })
export type DefaultAccount = z.infer<typeof defaultAccountSchema>
