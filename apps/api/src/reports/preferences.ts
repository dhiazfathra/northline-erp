import { sql } from 'drizzle-orm'
import { logActivity } from '../activity/log'
import type { Tx } from '../db'
import { DomainError } from '../ledger/deciders'
import type { AgingBasis } from './receivables'

export type ReportStyle = 'RETAIL' | 'STANDARD'
export type ReportPreferences = { agingBasis: AgingBasis; reportStyle: ReportStyle }

/** Per-company report preferences (ADR-0037); defaults match Manufaktur/Retail Demo. */
export async function reportPreferences(tx: Tx): Promise<ReportPreferences> {
  const [r] = await tx.execute(sql`SELECT aging_basis, report_style FROM ledger_settings`)
  return { agingBasis: (r?.aging_basis as AgingBasis | undefined) ?? 'DUE_DATE', reportStyle: (r?.report_style as ReportStyle | undefined) ?? 'RETAIL' }
}

export async function setReportPreferences(tx: Tx, p: ReportPreferences) {
  const r = await tx.execute(sql`UPDATE ledger_settings SET aging_basis = ${p.agingBasis}, report_style = ${p.reportStyle} RETURNING 1`)
  if (!r.length) throw new DomainError('ledger_settings not configured')
  await logActivity(tx, { action: 'UPDATE', entity: 'PRF', reference: `Umur ${p.agingBasis}, gaya laporan ${p.reportStyle}` })
}
