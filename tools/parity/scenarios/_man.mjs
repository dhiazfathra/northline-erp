// Manufaktur Demo ids the batch 4 scenarios share (P4.2 batch 4).
export const IDS = { customer: 350, vendor: 450, item: 350, unit: 50, utama: 50, gudangB: 100, wip: 150, diff: 251, expense: 104, dpAccount: 58 };
// NL-T2-C1, NL-T3-V1, NL-T4-B1 (NL-T4 Barang A, PCS), warehouses Utama / NL-Gudang B, 110403 Persediaan Dalam Proses, 510102 Selisih Biaya Produksi,
// 600001 Beban Iklan, 110302 Uang Muka Pembelian IDR
export const ITEM_NAME = 'NL-T4 Barang A';
/** Flat `param.<key>[i].` detail rows with `_status: insert`. */
export const flatRows = (key, lines, f) => Object.assign({}, ...lines.map((l, i) => Object.fromEntries(Object.entries({ ...f(l, i), seq: i + 1, _status: 'insert' }).map(([k, v]) => [`param.${key}[${i}].${k}`, v]))));
export const branch = (b) => (b['param.branchId'] === 50 ? 'Kantor Pusat' : b['param.branchId']);
