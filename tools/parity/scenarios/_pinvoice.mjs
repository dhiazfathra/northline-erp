// A purchase invoice the purchase payment and return scenarios draw on (NL-T3-V1, service NL-T2-S1, untaxed), created in setup and deleted in teardown.
import { call } from '../../accurate/call.mjs';
import { accDelete, accMessage, accNewForm, accSaveBody, dmy } from '../lib.mjs';
export const PI_MOD = 'accurate__vendor__purchase-invoice';
export const IDS = { vendor: 450, item: 300, unit: 150, bank: 650 }; // NL-T3-V1, NL-T2-S1 (unit JAM), NL-T1-1101 in Manufaktur Demo
let piForm;
/** Accurate: saves the invoice; returns its id, number and first detail row id. */
export async function accPurchaseInvoice(app, log, { date, bill, description, qty, price }) {
  piForm = await accNewForm(app, PI_MOD);
  const p = { ...JSON.parse(piForm.body._param), transDate: dmy(date), shipDate: dmy(date), dueDate: dmy(date), taxDate: dmy(date), vendorId: IDS.vendor, billNumber: bill, description,
    detailItem: [{ _status: 'insert', seq: 1, itemId: IDS.item, itemUnitId: IDS.unit, detailName: 'NL-T2 Jasa Konsultasi', quantity: qty, unitPrice: price, totalPrice: qty * price, useTax1: false }] };
  const r = await accSaveBody(app, piForm.urls.submit, { _param: JSON.stringify(p) });
  log('setup invoice', r?.s, r?.r?.number ?? accMessage(r));
  if (!r?.s) throw new Error('setup invoice failed');
  const v = (await call(app, piForm.urls.select, { id: r.r.id }))?.d;
  return { invoiceId: r.r.id, invoice: r.r.number, invoiceRowId: v?.detailItem?.[0]?.id };
}
export async function accPurchaseInvoiceTeardown(app, log, x) { const r = await accDelete(app, piForm.urls.del, x.invoiceId); log('teardown invoice', r?.s, accMessage(r)) }
export const erpPurchaseInvoice = ({ date, bill, description, qty, price }) => ['POST', '/purchases/invoices', { idempotencyKey: `p4-pi-${description}-${Date.now()}`, vendor: 'NL-T3-V1', bill, date, description,
  lines: [{ item: 'NL-T2-S1', name: 'NL-T2 Jasa Konsultasi', qty, price }] }];
