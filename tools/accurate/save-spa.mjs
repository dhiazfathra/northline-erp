// usage: node save-spa.mjs '<spec json>'  spec: {type: ITEM_PRICE_TYPE|ITEM_DISCOUNT_TYPE, date, description, priceCategoryId, lines:[{itemId, unitId, price?, discPct?, minQty?}]}
// New Penyesuaian Harga/Diskon Jual from the fresh-form fields (spa-fresh.json), posted as _param JSON via the background save.
import { openSandbox, log } from './acc.mjs';
import { call } from './call.mjs';
import { readFileSync } from 'node:fs';
const spec = JSON.parse(process.argv[2]);
const f = JSON.parse(readFileSync(new URL('./spa-fresh.json', import.meta.url)));
const p = Object.fromEntries(Object.entries(f).filter(([k, v]) => !/Id$|\[/.test(k) || ['currencyId'].includes(k)));
for (const k of ['id', 'optLock', 'number', 'createdBy', 'priceCategory', 'branchId']) delete p[k];
Object.assign(p, { salesAdjustmentType: spec.type, transDate: spec.date, description: spec.description, priceCategoryId: spec.priceCategoryId ?? 50,
  detailItem: spec.lines.map((l, i) => ({ _status: 'insert', seq: i + 1, itemId: l.itemId, itemUnitId: l.unitId, price: l.price ?? 0, itemDiscPercent: l.discPct ?? '', minQuantity: l.minQty ?? 0 })) });
const { browser, app } = await openSandbox();
let r = await call(app, '/accurate/inventory/bg-save-sellingprice-adjustment.do', { _param: JSON.stringify(p) });
for (let i = 0; i < 30 && r?.s && typeof r.b === 'string'; i++) {
  const q = await call(app, '/accurate/company/bg-proc-response.do', { bgPid: r.b, keepCache: 'true' });
  if (q.d?.status !== 'RUNNING') { r = q.d?.response ?? q; break; }
  await new Promise((ok) => setTimeout(ok, 2000));
}
log(r?.s, JSON.stringify(r?.s ? { id: r.r?.id, number: r.r?.number } : r?.d ?? r).slice(0, 400));
await browser.close();
