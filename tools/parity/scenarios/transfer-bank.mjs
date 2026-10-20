// Kas & Bank > Transfer Bank: move 100.000 from NL-T1 Kas to Kas Kecil; edit the amount and description; save without a destination
// rejected; delete; journal after edit and delete; list. (Kas Kecil is opened in the local ERP by the scenario's setup.)
import { accFlow, compareFlow, dmy, erpFlow, today } from '../lib.mjs';

const MOD = 'accurate__cash-bank__bank-transfer';
const IDS = { from: 650, to: 67 }; // NL-T1-1101 NL-T1 Kas, 110101 Kas Kecil
const inputs = { date: '2051-01-17', from: 'NL-T1-1101', to: '110101', amount: 100000, description: 'NL-P4-BT1', edit: { description: 'NL-P4-BT1 edit', amount: 125000 }, reject: { description: 'NL-P4-BT1 tanpa tujuan' } };
const head = (d, amount, to = IDS.to) => ({ 'param.transDate': dmy(inputs.date), 'param.fromBankId': IDS.from, 'param.toBankId': to, 'param.fromBankAmount': amount, 'param.toBankAmount': amount, 'param.description': d });

export default {
  title: 'Transfer Bank', module: 'Kas & Bank', dir: 'kas-bank/transfer-bank', mod: MOD,
  accuratePath: 'Kas & Bank > Transfer Bank', erpRoute: 'POST/PUT/DELETE /api/cash-bank/transfers', adrs: ['ADR-0041', 'ADR-0045'],
  steps: ['Transfer 100.000 from NL-T1 Kas to Kas Kecil, dated 17 Jan 2051.', 'Edit it: new description, 125.000.', 'Read Keseluruhan Jurnal for the day.', 'Save a transfer without a destination bank: rejected.', 'Delete it; read the journal and the list again.'],
  inputs,
  accurate: (ctx) => accFlow(ctx, {
    mod: MOD, date: inputs.date, keyword: inputs.description,
    fieldMap: { number: 'number', transDate: 'date', fromBank: 'from', toBank: 'to', fromBankAmount: 'amount', toBankAmount: 'amount', description: 'description', branch: 'branch', toBranch: 'branch' },
    defaults: (b) => ({ date: b['param.transDate'] === today() ? 'today' : b['param.transDate'], rate: b['param.fromBankRate'] }),
    create: () => head(inputs.description, inputs.amount),
    edit: { arg: inputs.edit, mutate: (fd, a) => { fd.description(a.description); fd.fromBankAmount(a.amount); fd.toBankAmount(a.amount) } },
    reject: { body: () => head(inputs.reject.description, inputs.amount, ''), ui: { arg: () => ({ description: inputs.reject.description }), mutate: (fd, a) => { fd.description(a.description) } } },
  }),
  erp: (ctx) => { const k = `p4-bt1-${Date.now()}`, base = { date: inputs.date, from: inputs.from, to: inputs.to }; return erpFlow(ctx, {
    date: inputs.date, defaults: { date: 'required', rate: 1 },
    setup: async (send) => { await send('setup account', ['POST', '/ledger/commands', { type: 'OpenAccount', idempotencyKey: 'p4-acct-110101', no: '110101', name: 'Kas Kecil', accountType: 'CASH_BANK' }]) },
    create: () => ['POST', '/cash-bank/transfers', { ...base, idempotencyKey: k, amount: inputs.amount, description: inputs.description }],
    number: (r) => r.number,
    edit: (n) => ['PUT', `/cash-bank/transfers/${n}`, { ...base, idempotencyKey: k + '-edit', amount: inputs.edit.amount, description: inputs.edit.description }],
    reject: () => ['POST', '/cash-bank/transfers', { ...base, to: '', idempotencyKey: k + '-bad', amount: inputs.amount, description: inputs.reject.description }],
    del: (n) => ['DELETE', `/cash-bank/transfers/${n}`, { idempotencyKey: k + '-del' }],
    list: () => `/reports/general-ledger/journal-list?from=${inputs.date}&to=${inputs.date}`,
  }) },
  compare: (a, e) => compareFlow(a, e),
  accepted: {
    defaults: 'D1: the API takes every value explicitly; today\'s date and the rate 1 are client defaults.',
    'header fields without an ERP counterpart': 'D2: attachments, custom fields, the difference account and exchange rates (foreign-currency transfers) are not in the ERP.',
  },
};
