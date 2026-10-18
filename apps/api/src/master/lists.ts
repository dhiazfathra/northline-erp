import { sql } from 'drizzle-orm'
import type { Db } from '../db'

// Master-data lists (Lain-lain / Aset Tetap); layouts from docs/reports/captures/<planId>.json.
const fmtNum = (n: number) => String(n).replace('.', ',')

export async function currencyList(db: Db) {
  const label: Record<string, string> = { FOREIGN_TO_LOCAL: 'Asing - Lokal', LOCAL_TO_FOREIGN: 'Lokal - Asing' }
  return [['Negara/Nama', 'Kode', 'Simbol', 'Tipe Nilai Tukar'], ...(await db.execute(sql`SELECT * FROM currencies ORDER BY name`)).map(r => [r.name as string, r.code as string, r.symbol as string, label[r.converter as string]!])]
}
export const fobList = async (db: Db) => [['Nama'], ...(await db.execute(sql`SELECT name FROM fobs ORDER BY seq`)).map(r => [r.name as string])]
/** Daftar Pajak: rate printed as a plain number. */
export const taxList = async (db: Db) => [['Keterangan', 'Persentase'], ...(await db.execute(sql`SELECT name, rate FROM taxes ORDER BY seq`)).map(r => [r.name as string, fmtNum(Number(r.rate))])]
/** Daftar Pengiriman: an empty street prints nothing. */
export const shipmentList = async (db: Db) => [['Nama', 'Jalan'], ...(await db.execute(sql`SELECT name, street FROM shipments ORDER BY name`)).map(r => [r.name as string, r.street as string].filter(Boolean))]
/** Daftar Karyawan: empty contact fields print nothing; Penjual Ya/Tidak. */
export const employeeList = async (db: Db) => [['ID Karyawan', 'Nama', 'Posisi Jabatan', 'Handphone', 'No. Telp. Bisnis', 'Email', 'Penjual'],
  ...(await db.execute(sql`SELECT * FROM employees ORDER BY no`)).map(r => [r.no, r.name, r.position, r.mobile, r.phone, r.email].map(String).filter(Boolean).concat(r.salesman ? 'Ya' : 'Tidak'))]
/** Daftar Kategori Aset Tetap Pajak: rate = 100 / life (straight line) or 200 / life (declining balance). */
export const fiscalFaTypeList = async (db: Db) => [['Nama', 'Tarif Penyusutan (%)', 'Perkiraan Umur (tahun)', 'Metode Penyusutan'],
  ...(await db.execute(sql`SELECT * FROM fiscal_fa_types ORDER BY seq`)).map(r => {
    const y = Number(r.life_years), sl = r.method === 'STRAIGHTLINE'
    if (r.method === 'NONE') return [r.name as string, '0 %', `${y} Tahun`, 'Tidak Terdepresiasi']
    return [r.name as string, `${fmtNum((sl ? 100 : 200) / y)} %`, `${y} Tahun`, sl ? 'Metode Garis Lurus' : 'Metode Saldo Menurun']
  })]
