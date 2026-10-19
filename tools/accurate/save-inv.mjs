// usage: KIND=si|pi node save-inv.mjs '<spec json>'  spec: {partyId,date,dueDate,description,taxable,inclusiveTax,lines:[{itemId,unitId,name,qty,price,discPct?,useTax1,tax3Id? (PPh, pi only)}]}
// Builds a NEW sales/purchase invoice from the captured wire template (<kind>-wire.json) and saves it in the sandbox.
const KIND = process.env.KIND ?? 'si';
const K = { si: { file: './si-wire.json', save: '/accurate/customer/bg-save-sales-invoice.do', party: 'customerId', parent: 'salesInvoiceId' },
  pi: { file: './pi-wire.json', save: '/accurate/vendor/bg-save-purchase-invoice.do', party: 'vendorId', parent: 'purchaseInvoiceId' } }[KIND];
import { openSandbox, assertSandbox, log } from './acc.mjs';
import { call } from './call.mjs';
import { readFileSync } from 'node:fs';
const spec = JSON.parse(process.argv[2]);
const t = JSON.parse(readFileSync(new URL(K.file, import.meta.url)));
const p = structuredClone(t);
const line0 = t.detailItem[0];
for (const k of ['id', 'optLock', 'number', 'detailTax', 'createdBy']) delete p[k];
for (const k of ['tax3Amount', 'taxableAmount1', 'tax1Amount', 'tax1AmountBase', 'totalAmount', 'subTotal', 'dppAmount']) if (k in p) p[k] = 0;
Object.assign(p, {
  [K.party]: spec.partyId, ...(spec.billNumber ? { billNumber: spec.billNumber } : {}), transDate: spec.date, shipDate: spec.date, dueDate: spec.dueDate ?? spec.date, taxDate: spec.date,
  description: spec.description, taxable: spec.taxable, inclusiveTax: spec.inclusiveTax ?? false,
  cashDiscount: spec.cashDiscount ?? 0, cashDiscPercent: spec.cashDiscPercent ?? '',
});
Object.assign(p, spec.extra ?? {}) // raw header fields, e.g. taxNumber/taxAutoNumber/documentCode
// An edit-form template lacks the auto-number scheme a fresh form carries; without it purchase saves fail server-side (NPE).
if (KIND === 'pi') { delete p.journalId; delete p.paymentHistoryId; Object.assign(p, { typeAutoNumber: spec.typeAutoNumber ?? 62, countAutoNumber: 1 }); }
p.detailItem = spec.lines.map((l, i) => {
  const d = { ...line0, _status: 'insert', seq: i + 1, itemId: l.itemId, itemUnitId: l.unitId, detailName: l.name, quantity: String(l.qty), unitPrice: String(l.price),
    itemDiscPercent: l.discPct ?? '', itemCashDiscount: '0', useTax1: l.useTax1 ?? spec.taxable, ...(l.extra ?? {}) }; // extra: raw line fields, e.g. warehouseId
  for (const k of ['id', 'optLock', K.parent, 'itemHistoryId', 'totalPrice', 'salesAmount', 'salesAmountBase', 'dppAmount', 'grossAmount', 'tax1Amount', 'availableQuantity', 'availableTotalPrice', 'availableUnitPrice', 'availableItemCashDiscount', 'lastItemCashDiscount', 'lastItemDiscPercent', 'quantityDefault', 'availableItemUnitId', 'availableItemUnitName', 'detailSerialNumber']) delete d[k];
  if (l.serials) d.detailSerialNumber = l.serials.map(sn => ({ _status: 'insert', ...sn }));
  if (KIND === 'pi') { const amt = l.qty * l.price; Object.assign(d, { useTax3: !!l.tax3Id, tax3Id: l.tax3Id ?? null, purchaseAmount: amt, purchaseAmountBase: amt, itemCost: amt, totalPrice: amt }); }
  return d;
});
const { browser, app } = await openSandbox();
await assertSandbox(app);
// bg-save-* returns a background job id; poll it like reports do.
const save = async () => {
  let r = await call(app, K.save, { _param: JSON.stringify(p) });
  for (let i = 0; i < 30 && r?.s && r.d?.bgPid === undefined && typeof r.b === 'string'; i++) {
    const q = await call(app, '/accurate/company/bg-proc-response.do', { bgPid: r.b, keepCache: 'true' });
    if (q.d?.status !== 'RUNNING') { r = q.d?.response ?? q; break; }
    await new Promise((ok) => setTimeout(ok, 2000));
  }
  return r;
};
let res = await save();
for (let i = 0; i < 3 && res && res.s === false && res.c; i++) { log('warning flag', res.c); p[res.c] = true; res = await save(); }
log(JSON.stringify(res).slice(0, 1500));
await browser.close();
