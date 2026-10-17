import { z } from 'zod'

const t = z.object({ id: z.string(), en: z.string() })

/** Record shown in the right-side drawer (review cards, list rows, KPIs). */
export const drawerRecordSchema = z.object({
  kind: t,
  title: z.string(),
  value: z.string(),
  note: t,
  lines: z.array(z.object({ a: t, b: z.string() })),
  cta: t,
})
export type DrawerRecord = z.infer<typeof drawerRecordSchema>

export const kpiSchema = z.object({
  label: t,
  value: z.string(),
  delta: z.string(),
  /** 24 column heights (1-4 dots) for the dot-matrix chart. */
  cols: z.array(z.number()),
  to: z.string(),
})
export type Kpi = z.infer<typeof kpiSchema>

export const reviewCardSchema = z.object({ id: z.string(), title: t, text: t, bg: z.string(), record: drawerRecordSchema })
export type ReviewCard = z.infer<typeof reviewCardSchema>

export const tileSchema = z.object({
  label: t,
  v: z.string(),
  d: z.string(),
  bars: z.array(z.number()),
  to: z.string().optional(),
  /** Locked tile: names the Preferensi switch that enables it. */
  off: t.optional(),
})
export const moduleGroupSchema = z.object({ title: t, sub: t, to: z.string().optional(), tiles: z.array(tileSchema) })
export type ModuleGroup = z.infer<typeof moduleGroupSchema>

export const overviewSchema = z.object({
  kpis: z.array(kpiSchema),
  cards: z.array(reviewCardSchema),
  lowTabs: z.array(z.object({ name: t, count: z.number() })),
  groups: z.array(moduleGroupSchema),
})
export type Overview = z.infer<typeof overviewSchema>

export const listRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  contact: z.string(),
  bal: z.string(),
  status: z.enum(['active', 'overdue', 'inactive']),
})
export type ListRow = z.infer<typeof listRowSchema>

export const txTypes = ['invoice', 'bill', 'receipt', 'payment', 'journal'] as const
export const newTxSchema = z.object({
  type: z.enum(txTypes),
  counterparty: z.string().trim().min(1),
  amount: z.string().regex(/^[\d.,]+$/),
  due: z.string().trim().min(1),
})
export type NewTxInput = z.infer<typeof newTxSchema>
