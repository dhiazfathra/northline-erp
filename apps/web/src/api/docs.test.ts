import { afterEach, expect, test } from 'bun:test'
import type { DocRow } from '@northline/schemas/docs'
import { PaidInvoiceError, docsQuery, openInvoices } from './docs'

const real = globalThis.fetch
afterEach(() => { globalThis.fetch = real })

const inv = (no: string, party: string, total: number, paid: number): DocRow => ({
  id: no, type: 'sales-invoice', no, jv: no, date: '05/10/2026', party, description: '', source: 'Faktur Penjualan', total, paid, lines: [],
  values: { date: '05/10/2026', autoNo: false, number: no, description: '', party, items: [{ code: 'A', name: 'A', unit: 'PCS', qty: 1, price: 1_000, discPct: 0 }], discPct: 0, taxable: true, inclusive: false, terms: 'COD', poNo: '', supplierNo: '', dp: [], invoice: '' },
})

test('openInvoices: only this party, owing net of paid, settled invoices dropped, dpp excludes PPN', () => {
  const rows = [inv('SI.1', 'A', 1_110, 110), inv('SI.2', 'A', 1_110, 1_110), inv('SI.3', 'B', 1_110, 0)]
  expect(openInvoices(rows, 'A')).toEqual([{ invoice: 'SI.1', date: '05/10/2026', total: 1_110, owing: 1_000, dpp: 1_000, pay: 0, discount: 0, pph: false }])
})


test('a paid-invoice refusal surfaces as PaidInvoiceError, other errors keep the API message', async () => {
  globalThis.fetch = (async () => Response.json({ error: 'paid', code: 'paid' }, { status: 409 })) as unknown as typeof fetch
  await expect(docsQuery('sales-invoice').queryFn!({} as never)).rejects.toBeInstanceOf(PaidInvoiceError)
  globalThis.fetch = (async () => Response.json({ error: 'Pelanggan X tidak ditemukan' }, { status: 409 })) as unknown as typeof fetch
  await expect(docsQuery('sales-invoice').queryFn!({} as never)).rejects.toThrow('Pelanggan X tidak ditemukan')
})
