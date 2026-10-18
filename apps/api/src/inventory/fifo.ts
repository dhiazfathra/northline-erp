import { sql } from 'drizzle-orm'
import type { Tx } from '../db'
import { DomainError } from '../ledger/deciders'

// FIFO costing as the sandbox does it (fixtures/inventory-t4.json: S2 cost 2×10.000 + 5×13.000).
// shortcut: assumes documents are posted in date order; a back-dated movement would need re-costing later outs — add a re-cost job when edits/back-dating are allowed.

export interface Layer { date: string; qty: number; unitCost: number }

/** Remaining FIFO layers from movements in (date, id) order. */
export function layers(moves: { date: string; quantity: number; value: number }[]): Layer[] {
  const ls: Layer[] = []
  for (const m of moves) {
    if (m.quantity > 0) { ls.push({ date: m.date, qty: m.quantity, unitCost: m.value / m.quantity }); continue }
    let out = -m.quantity
    while (out > 1e-9) {
      const l = ls[0]
      if (!l) break
      const take = Math.min(l.qty, out)
      l.qty -= take; out -= take
      if (l.qty <= 1e-9) ls.shift()
    }
  }
  return ls
}

/** Cost (cents) of taking `qty` from the layers, oldest first; rounded per layer to whole cents. */
export function fifoCost(ls: Layer[], qty: number): number {
  let left = qty, cost = 0
  for (const l of ls) {
    if (left <= 1e-9) break
    const take = Math.min(l.qty, left)
    cost += Math.round(take * l.unitCost); left -= take
  }
  if (left > 1e-9) throw new DomainError(`Stok tidak cukup (kurang ${left})`)
  return cost
}

export async function loadMoves(tx: Tx, item: string, upTo: string) {
  return (await tx.execute(sql`SELECT to_char(date,'YYYY-MM-DD') AS date, quantity, value FROM stock_moves WHERE item_no = ${item} AND date <= ${upTo} ORDER BY date, id`))
    .map(r => ({ date: r.date as string, quantity: Number(r.quantity), value: Number(r.value) }))
}

export async function addMove(tx: Tx, m: { item: string; date: string; docType: string; docNumber: string; description: string; quantity: number; value: number }) {
  await tx.execute(sql`INSERT INTO stock_moves (item_no, date, doc_type, doc_number, description, quantity, value)
    VALUES (${m.item}, ${m.date}, ${m.docType}, ${m.docNumber}, ${m.description}, ${m.quantity}, ${m.value})`)
}
