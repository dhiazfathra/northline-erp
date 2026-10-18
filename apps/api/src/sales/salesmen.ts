import { sql } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../db'

// Tenaga Penjual master, commission rules and check-ins (ADR-0023). Salesmen ride on invoice lines (sales/service.ts).

const code = z.string().trim().min(1)
export const salesmanInput = z.object({ no: code, name: z.string().trim().min(1) })
export async function upsertSalesman(db: Db, input: z.input<typeof salesmanInput>) {
  const s = salesmanInput.parse(input)
  await db.execute(sql`INSERT INTO salesmen (no, name) VALUES (${s.no}, ${s.name}) ON CONFLICT (no) DO UPDATE SET name = EXCLUDED.name`)
}

/** Komisi Penjual: percent of the sales value of every item, paid to the listed levels (Urutan 1..5) of the listed salesmen (all when omitted). */
export const commissionInput = z.object({ name: z.string().trim().min(1), percent: z.number().positive(), levels: z.array(z.number().int().min(1).max(5)).min(1), salesmen: z.array(code).optional() })
export async function saveCommission(db: Db, input: z.input<typeof commissionInput>) {
  const c = commissionInput.parse(input)
  const arr = (xs: (string | number)[]) => sql`ARRAY[${sql.join(xs.map(x => sql`${x}`), sql`, `)}]`
  await db.execute(sql`INSERT INTO salesman_commissions (name, percent, levels, salesmen) VALUES (${c.name}, ${c.percent}, ${arr(c.levels)}::integer[], ${c.salesmen ? sql`${arr(c.salesmen)}::text[]` : null})`)
}

/** Check In from the mobile sales app (the web app only lists them). */
export const checkInInput = z.object({ date: z.string(), salesman: code, address: z.string().default(''), customerName: z.string().default(''), phone: z.string().default(''), contact: z.string().default(''), transaction: z.string().default('') })
export async function recordCheckIn(db: Db, input: z.input<typeof checkInInput>) {
  const c = checkInInput.parse(input)
  await db.execute(sql`INSERT INTO sales_check_ins (date, salesman_no, address, customer_name, phone, contact, transaction_no) VALUES (${c.date}, ${c.salesman}, ${c.address}, ${c.customerName}, ${c.phone}, ${c.contact}, ${c.transaction})`)
}
