// usage: KIND=si|pi node save-inv.mjs '<spec json>'  spec: {partyId,date,dueDate,description,taxable,inclusiveTax,lines:[{itemId,unitId,name,qty,price,discPct?,useTax1}]}
// Builds a NEW sales/purchase invoice from the captured wire template (<kind>-wire.json) and saves it in the sandbox.
const KIND = process.env.KIND ?? 'si';
const K = { si: { file: './si-wire.json', save: '/accurate/customer/save-sales-invoice.do', party: 'customerId', parent: 'salesInvoiceId' },
  pi: { file: './pi-wire.json', save: '/accurate/vendor/save-purchase-invoice.do', party: 'vendorId', parent: 'purchaseInvoiceId' } }[KIND];
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
p.detailItem = spec.lines.map((l, i) => {
  const d = { ...line0, _status: 'insert', seq: i + 1, itemId: l.itemId, itemUnitId: l.unitId, detailName: l.name, quantity: String(l.qty), unitPrice: String(l.price),
    itemDiscPercent: l.discPct ?? '', itemCashDiscount: '0', useTax1: l.useTax1 ?? spec.taxable };
  for (const k of ['id', 'optLock', K.parent, 'itemHistoryId', 'totalPrice', 'salesAmount', 'salesAmountBase', 'dppAmount', 'grossAmount', 'tax1Amount', 'availableQuantity', 'availableTotalPrice', 'availableUnitPrice', 'availableItemCashDiscount', 'lastItemCashDiscount', 'lastItemDiscPercent', 'quantityDefault', 'availableItemUnitId', 'availableItemUnitName', 'detailSerialNumber']) delete d[k];
  if (KIND === 'pi') { const amt = l.qty * l.price; Object.assign(d, { useTax3: false, tax3Id: null, purchaseAmount: amt, purchaseAmountBase: amt, itemCost: amt, totalPrice: amt }); }
  return d;
});
const { browser, app } = await openSandbox();
await assertSandbox(app);
let res = await call(app, K.save, { _param: JSON.stringify(p) });
for (let i = 0; i < 3 && res && res.s === false && res.c; i++) { log('warning flag', res.c); p[res.c] = true; res = await call(app, K.save, { _param: JSON.stringify(p) }); }
log(JSON.stringify(res).slice(0, 1500));
await browser.close();
