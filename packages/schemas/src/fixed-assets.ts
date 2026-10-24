import { z } from 'zod'

export const assetFileSchema = z.object({ name: z.string(), size: z.number(), url: z.string() })
export type AssetFile = z.infer<typeof assetFileSchema>

export const assetExpenseSchema = z.object({
  code: z.string(),
  desc: z.string(),
  /** ISO yyyy-mm-dd */
  date: z.string().min(1),
  amount: z.number().positive(),
  /** Credit account of a saved expense row; new rows have none. */
  account: z.string().optional(),
  /** Pengeluaran Aset number when the row was picked from one; the API refuses picking it twice. */
  expenditure: z.string().optional(),
})
export type AssetExpense = z.infer<typeof assetExpenseSchema>

const assetFields = z.object({
  name: z.string().trim().min(1),
  autoCode: z.boolean(),
  codeType: z.string(),
  code: z.string().trim(),
  buy: z.string().min(1),
  use: z.string().min(1),
  intangible: z.boolean(),
  method: z.string().min(1),
  category: z.string().min(1),
  assetAccount: z.string().min(1),
  accumAccount: z.string().min(1),
  expenseAccount: z.string().min(1),
  qty: z.number().int().positive(),
  years: z.number().int().min(0),
  months: z.number().int().min(0).max(11),
  salvage: z.number().min(0),
  expenses: z.array(assetExpenseSchema).min(1),
  location: z.string().min(1),
  department: z.string(),
  note: z.string(),
  tax: z.boolean(),
  files: z.array(assetFileSchema),
})

export const fixedAssetFormSchema = assetFields
  .refine((v) => v.years * 12 + v.months > 0, { path: ['years'] })
  .refine((v) => (v.autoCode ? !!v.codeType : !!v.code), { path: ['code'] })
export type FixedAssetForm = z.infer<typeof fixedAssetFormSchema>

export const fixedAssetSchema = assetFields.extend({
  id: z.string(),
  status: z.enum(['active', 'disposed', 'draft']),
  lastDep: z.string(),
})
export type FixedAsset = z.infer<typeof fixedAssetSchema>
