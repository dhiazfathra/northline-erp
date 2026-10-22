import { z } from 'zod'

export const reportSchema = z.object({
  id: z.string(),
  cat: z.string(),
  type: z.enum(['std', 'anl', 'tax']),
  name: z.object({ id: z.string(), en: z.string() }),
  desc: z.object({ id: z.string(), en: z.string() }),
  icon: z.string(),
  /** 'point' = single as-of date (balance sheet), 'range' = from/to. */
  dates: z.enum(['point', 'range']),
  starred: z.boolean(),
  /** Reports that live on their own screen (e.g. Neraca Percobaan). */
  href: z.string().optional(),
})
export type Report = z.infer<typeof reportSchema>

export const reportRowSchema = z.object({
  k: z.enum(['sec', 'grp', 'acc', 'sub', 'tot']),
  t: z.string(),
  /** Source row identity from the API; survives renames in a saved layout. Rows the user added have none. */
  key: z.string().optional(),
  code: z.string().optional(),
  cur: z.number().optional(),
  prev: z.number().optional(),
})
export type ReportRow = z.infer<typeof reportRowSchema>

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const csv = z.string().regex(/^[a-z,]*$/)

/** Search params of /reports/$reportId, produced by the Report parameters dialog. */
export const reportSearchSchema = z.object({
  from: isoDate.optional().catch(undefined),
  to: isoDate.catch('2026-10-17').default('2026-10-17'),
  branch: z.string().max(200).catch('Pusat').default('Pusat'),
  cur: z.string().max(10).catch('IDR').default('IDR'),
  opts: csv.catch('total').default('total'),
  cols: csv.catch('').default(''),
  ai: z.literal(1).optional().catch(undefined),
})
export type ReportSearch = z.infer<typeof reportSearchSchema>

/** Report parameters dialog form. */
export const reportParamsSchema = z.object({
  from: isoDate.optional(),
  to: isoDate,
  branch: z.array(z.string()).min(1),
  cur: z.array(z.string()).min(1),
  opts: z.array(z.string()),
  cols: z.array(z.string()),
})
export type ReportParams = z.infer<typeof reportParamsSchema>

export const aiMessageSchema = z.object({
  id: z.string(),
  bot: z.boolean(),
  t: z.string(),
  tm: z.string(),
  cr: z.string().optional(),
})
export type AiMessage = z.infer<typeof aiMessageSchema>
