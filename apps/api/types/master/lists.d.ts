import type { Db } from '../db';
export declare function currencyList(db: Db): Promise<string[][]>;
export declare const fobList: (db: Db) => Promise<string[][]>;
/** Daftar Pajak: rate printed as a plain number. */
export declare const taxList: (db: Db) => Promise<string[][]>;
/** Daftar Pengiriman: an empty street prints nothing. */
export declare const shipmentList: (db: Db) => Promise<string[][]>;
/** Daftar Karyawan: empty contact fields print nothing; Penjual Ya/Tidak. */
export declare const employeeList: (db: Db) => Promise<string[][]>;
/** Daftar Kategori Aset Tetap Pajak: rate = 100 / life (straight line) or 200 / life (declining balance). */
export declare const fiscalFaTypeList: (db: Db) => Promise<string[][]>;
