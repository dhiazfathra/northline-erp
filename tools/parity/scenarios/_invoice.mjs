// A sales invoice the receipt and return scenarios draw on (NL-T2-C1, service NL-T2-S1, untaxed), created in setup and deleted in teardown.
import { call } from '../../accurate/call.mjs';
import { accDelete, accMessage, accNewForm, accSaveBody, dmy } from '../lib.mjs';
export const SI_MOD = 'accurate__customer__sales-invoice';
export const IDS = { customer: 350, item: 300, unit: 150, bank: 650 }; // NL-T2-C1, NL-T2-S1 (unit JAM), NL-T1-1101 in Manufaktur Demo
let siForm;
/** Accurate: saves the invoice; returns its id, number and first detail row id. */
export async function accInvoice(app, log, { date, description, qty, price }) {
  siForm = await accNewForm(app, SI_MOD);
  const p = { ...JSON.parse(siForm.body._param), transDate: dmy(date), shipDate: dmy(date), dueDate: dmy(date), customerId: IDS.customer, description,
    detailItem: [{ _status: 'insert', seq: 1, itemId: IDS.item, itemUnitId: IDS.unit, detailName: 'NL-T2 Jasa Konsultasi', quantity: qty, unitPrice: price, totalPrice: qty * price, useTax1: false }] };
  const r = await accSaveBody(app, siForm.urls.submit, { _param: JSON.stringify(p) });
  log('setup invoice', r?.s, r?.r?.number ?? accMessage(r));
  if (!r?.s) throw new Error('setup invoice failed');
  const v = (await call(app, siForm.urls.select, { id: r.r.id }))?.d;
  return { invoiceId: r.r.id, invoice: r.r.number, invoiceRowId: v?.detailItem?.[0]?.id };
}
export async function accInvoiceTeardown(app, log, x) { const r = await accDelete(app, siForm.urls.del, x.invoiceId); log('teardown invoice', r?.s, accMessage(r)) }
export const erpInvoice = ({ date, description, qty, price }) => ['POST', '/sales/invoices', { idempotencyKey: `p4-si-${description}-${Date.now()}`, customer: 'NL-T2-C1', date, description,
  lines: [{ item: 'NL-T2-S1', name: 'NL-T2 Jasa Konsultasi', qty, price }] }];
