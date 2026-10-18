// usage: node save-si.mjs '<spec json>'  spec: {customerId,date,dueDate,description,taxable,inclusiveTax,lines:[{itemId,unitId,name,qty,price,discPct?,useTax1}]}
// Builds a NEW sales invoice from the captured taxed template (si-template.json) and saves it in the sandbox.
import { openSandbox, assertSandbox, log } from './acc.mjs';
import { call } from './call.mjs';
import { readFileSync } from 'node:fs';
const spec = JSON.parse(process.argv[2]);
const t = JSON.parse(readFileSync(new URL('./si-wire.json', import.meta.url)));
const p = structuredClone(t);
const line0 = t.detailItem[0];
for (const k of ['id', 'optLock', 'number', 'tax1Amount', 'tax1AmountBase', 'totalAmount', 'subTotal', 'dppAmount', 'detailTax', 'createdBy']) delete p[k];
Object.assign(p, {
  customerId: spec.customerId, transDate: spec.date, shipDate: spec.date, dueDate: spec.dueDate ?? spec.date, taxDate: spec.date,
  description: spec.description, taxable: spec.taxable, inclusiveTax: spec.inclusiveTax ?? false,
  cashDiscount: spec.cashDiscount ?? 0, cashDiscPercent: spec.cashDiscPercent ?? '',
});
p.detailItem = spec.lines.map((l, i) => {
  const d = { ...line0, _status: 'insert', seq: i + 1, itemId: l.itemId, itemUnitId: l.unitId, detailName: l.name, quantity: String(l.qty), unitPrice: String(l.price),
    itemDiscPercent: l.discPct ?? '', itemCashDiscount: '0', useTax1: l.useTax1 ?? spec.taxable };
  for (const k of ['id', 'optLock', 'salesInvoiceId', 'itemHistoryId', 'totalPrice', 'salesAmount', 'salesAmountBase', 'dppAmount', 'grossAmount', 'tax1Amount', 'availableQuantity', 'availableTotalPrice', 'availableUnitPrice', 'availableItemCashDiscount', 'lastItemCashDiscount', 'lastItemDiscPercent', 'quantityDefault', 'availableItemUnitId', 'availableItemUnitName', 'detailSerialNumber']) delete d[k];
  return d;
});
const { browser, app } = await openSandbox();
await assertSandbox(app);
let res = await call(app, '/accurate/customer/save-sales-invoice.do', { _param: JSON.stringify(p) });
for (let i = 0; i < 3 && res && res.s === false && res.c; i++) { log('warning flag', res.c); p[res.c] = true; res = await call(app, '/accurate/customer/save-sales-invoice.do', { _param: JSON.stringify(p) }); }
log(JSON.stringify(res).slice(0, 1500));
await browser.close();
