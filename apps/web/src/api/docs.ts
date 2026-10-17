import type { DocItem, DocRow, DocStatus, DocType, NewDocInput } from '@northline/schemas/docs'
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { mock } from './mock'

const prefix: Record<DocType, string> = {
  'sales-quotation': 'SQ',
  'sales-order': 'SO',
  'sales-invoice': 'SI',
  'sales-receipt': 'SR',
  'purchase-order': 'PO',
  'purchase-invoice': 'PI',
  'purchase-payment': 'PP',
  'cash-receipt': 'CR',
  'cash-payment': 'CP',
  journal: 'JV',
  'stock-adjustment': 'IA',
}

export const customers = ['PT Sinar Pesisir', 'CV Maju Bersama', 'Toko Berkah Jaya', 'PT Arunika Retail', 'Klinik Sehat Sentosa', 'PT Laut Biru Logistik']
export const vendors = ['PT Sumber Makmur', 'CV Karya Mandiri', 'PT Indo Kemas', 'UD Sejahtera Abadi', 'PT Global Teknindo']
export const warehouses = ['Gudang Utama Jakarta', 'Gudang Cikarang', 'Gudang Surabaya']
export const contacts = [...customers.slice(0, 3), ...vendors.slice(0, 3)]

export function partiesFor(t: DocType) {
  if (t.startsWith('sales')) return customers
  if (t.startsWith('purchase')) return vendors
  if (t === 'stock-adjustment') return warehouses
  return contacts
}

export const catalog: Omit<DocItem, 'qty'>[] = [
  { name: 'Kertas HVS A4 80gsm', sku: 'ATK-001', price: 52_000 },
  { name: 'Tinta Printer Hitam', sku: 'ATK-014', price: 185_000 },
  { name: 'Kursi Kantor Ergonomis', sku: 'FRN-102', price: 1_450_000 },
  { name: 'Monitor 24 inci', sku: 'ELK-210', price: 2_350_000 },
  { name: 'Router Wi-Fi AX3000', sku: 'ELK-318', price: 975_000 },
  { name: 'Map Arsip Plastik', sku: 'ATK-045', price: 18_500 },
]

const notes = ['Pengiriman tahap 1', 'Sesuai kontrak Q4', '', 'Termin 30 hari', 'Barang titipan', 'Pembayaran via transfer', '']
const statuses: DocStatus[] = ['paid', 'unpaid', 'approved', 'draft', 'paid', 'unpaid', 'paid', 'approved']

const store = new Map<DocType, DocRow[]>()
function rowsFor(t: DocType) {
  let rows = store.get(t)
  if (!rows) {
    const parties = partiesFor(t)
    rows = Array.from({ length: 8 }, (_, i) => ({
      id: `${t}-${i}`,
      no: `${prefix[t]}.2026.10.${String(24 - i).padStart(5, '0')}`,
      date: `${String(17 - i * 2).padStart(2, '0')}/10/2026`,
      party: parties[(i + t.length) % parties.length],
      note: notes[i % notes.length],
      status: statuses[(i + t.length) % statuses.length],
      total: ((i * 7 + t.length * 3) % 23) * 1_150_000 + 2_450_000,
    }))
    store.set(t, rows)
  }
  return rows
}

export const docsQuery = (t: DocType) => queryOptions({ queryKey: ['docs', t], queryFn: () => mock(rowsFor(t)) })

export function useCreateDoc(t: DocType) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: NewDocInput) => {
      const rows = rowsFor(t)
      const row: DocRow = {
        id: `${t}-${Date.now()}`,
        no: `${prefix[t]}.2026.10.${String(25 + rows.length - 8).padStart(5, '0')}`,
        date: input.date,
        party: input.party,
        note: '',
        status: 'draft',
        total: input.items.reduce((s, i) => s + i.qty * i.price, 0),
      }
      rows.unshift(row)
      return mock(row, 400)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['docs', t] }),
  })
}
