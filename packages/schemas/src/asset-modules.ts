import { z } from 'zod'

export const assetExpenditureSchema = z.object({
  id: z.string(),
  number: z.string(),
  date: z.string(),
  description: z.string(),
  qty: z.number(),
  total: z.number(),
  status: z.enum(['Draf', 'Disetujui']),
  branch: z.string(),
})
export type AssetExpenditure = z.infer<typeof assetExpenditureSchema>

export const assetLineSchema = z.object({
  code: z.string(),
  name: z.string(),
  qty: z.string().regex(/^\d+$/),
  note: z.string(),
})
export type AssetLine = z.infer<typeof assetLineSchema>

export const assetExpenditureFormSchema = z.object({
  date: z.string().min(1),
  description: z.string().trim().min(1),
  assetCode: z.string(),
  qty: z.string().regex(/^\d*$/),
  note: z.string(),
  dpp: z.string().regex(/^\d*$/),
  applyDp: z.boolean(),
  lines: z.array(assetLineSchema).min(1),
})
export type AssetExpenditureForm = z.infer<typeof assetExpenditureFormSchema>

export const assetLocationSchema = z.object({ name: z.string(), address: z.string(), qty: z.number() })
export type AssetLocation = z.infer<typeof assetLocationSchema>
