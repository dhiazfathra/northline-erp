// Buku Besar > Pencatatan Gaji (monthly, one employee): create, edit, save without employees rejected, delete; journal after
// edit and after delete. The employee row is cloned from EPY.2050.01.00001's first row (NL-PY50-E1, TK0), read only.
import { accFlow, accView, compareFlow, dmy, erpFlow, today } from '../lib.mjs';

const MOD = 'accurate__cash-bank__employee-payment';
const TEMPLATE = 150; // EPY.2050.01.00001 (P3.6), never edited
const FEE = { 'Gaji Pokok': 50, 'Tunjangan Transportasi': 56 }; // employeeFee ids in Manufaktur Demo
const inputs = { date: '2051-02-28', year: 2051, month: 2, employee: 'NL-PY50-E1', description: 'NL-P4-EPY1',
  fees: { 'Gaji Pokok': 10000000, 'Tunjangan Transportasi': 1000000 }, payableAccount: '210206', pphAccount: '210205',
  feeAccounts: { 'Gaji Pokok': '600004', 'Tunjangan Transportasi': '600006' },
  edit: { description: 'NL-P4-EPY1 edit', fees: { 'Gaji Pokok': 12000000, 'Tunjangan Transportasi': 1000000 } }, reject: { description: 'NL-P4-EPY1 tanpa karyawan' } };
// TER A (TK0): 11.000.000 -> 3% = 330.000; 13.000.000 -> 5% = 650.000 (the rates calculate-employee-payment.do returned in P3.6)
const PPH = { 11000000: 330000, 13000000: 650000 };
const json = (f, o) => ({ _param: JSON.stringify({ ...JSON.parse(f.body._param), ...o }) });
/** One new employee row from the template row with `fees` (rupiah by name) and the amounts the form computes. */
function feeRow(tpl, fees) {
  const income = Object.values(fees).reduce((s, a) => s + a, 0), pph = PPH[income];
  const { id, optLock, employeePaymentId, ...r } = tpl;
  return { ...r, _status: 'insert', incomeAmount: income, pphAmount: pph, payablePphAmount: pph, amount: income - pph, pensionAmount: 0, healthInsuranceAmount: 0, exceedPphAmount: 0,
    detailEmployeePaymentFee: tpl.detailEmployeePaymentFee.map(({ id, optLock, employeePaymentDetailId, employeePaymentId, ...x }) => ({ ...x, _status: 'insert', amount: fees[x.employeeFee?.name] ?? 0 })) };
}
const head = (d) => ({ transDate: dmy(inputs.date), dueDate: dmy(inputs.date), pphDueDate: dmy(inputs.date), pensionDueDate: dmy(inputs.date), healthInsuranceDueDate: dmy(inputs.date),
  paymentYear: String(inputs.year), paymentMonth: String(inputs.month), employeePaymentType: 'MONTHLY', description: d });
const totals = (fees) => { const income = Object.values(fees).reduce((s, a) => s + a, 0), pph = PPH[income]; return { incomeAmount: income, pphAmount: pph, amount: income - pph } };

export default {
  title: 'Pencatatan Gaji', module: 'Buku Besar', dir: 'buku-besar/pencatatan-gaji', mod: MOD,
  accuratePath: 'Buku Besar > Pencatatan Gaji', erpRoute: 'POST/PUT/DELETE /api/payroll/runs',
  steps: ['Create a monthly payroll for Februari 2051 dated 28 Feb 2051: NL-PY50-E1 (TK0) Gaji Pokok 10.000.000, Tunjangan Transportasi 1.000.000 (PPh 21 TER 330.000).',
    'Edit it: new description, Gaji Pokok 12.000.000 (PPh 650.000).', 'Read Keseluruhan Jurnal for the day.', 'Save a payroll without employees: rejected.',
    'Delete it; read the journal and the list again.'],
  inputs,
  accurate: (ctx) => { let tpl; return accFlow(ctx, {
    mod: MOD, date: inputs.date, keyword: inputs.description, rowsKey: 'detailEmployeePayment',
    setup: async (app, log) => { tpl = (await accView(app, '/accurate/cash-bank/detail-employee-payment.do', TEMPLATE))?.d?.detailEmployeePayment?.[0]; log('template row employee', tpl?.employee?.number); return {} },
    fieldMap: { number: 'number', transDate: 'date', employeePaymentType: 'monthly run', paymentYear: 'year', paymentMonth: 'month', description: 'description', expensePayable: 'payableAccount', pphAccount: 'pphAccount',
      incomeAmount: 'lines[].income (computed)', amount: 'lines[].paid (computed)', pphAmount: 'lines[].pph (computed)', exceedPphAmount: 'lines[].pph (signed)', dueDate: 'date', pphDueDate: 'date', branch: 'branch',
      summaryEmployeePayment: 'lines[].fees (computed)', periodMonthName: 'month', paidAmount: 'payments (computed)', rate: 'rate' },
    defaults: (b) => { const p = JSON.parse(b._param); return { date: p.transDate === today() ? 'today' : p.transDate, period: `${p.paymentMonth}/${p.paymentYear}` === `${new Date().getMonth() + 1}/${new Date().getFullYear()}` ? 'this month' : `${p.paymentMonth}/${p.paymentYear}`,
      type: p.employeePaymentType, payableAccount: p.expensePayableId, pphAccount: p.pphAccountId, branch: p.branchId === 50 ? 'Kantor Pusat' : p.branchId } },
    create: (f) => json(f, { ...head(inputs.description), ...totals(inputs.fees), detailEmployeePayment: [feeRow(tpl, inputs.fees)] }),
    edit: { arg: () => ({ ...inputs.edit, tot: totals(inputs.edit.fees), pph: PPH[totals(inputs.edit.fees).incomeAmount] }), mutate: (fd, a) => {
      fd.description(a.description);
      for (const [k, v] of Object.entries(a.tot)) fd[k]?.(v);
      fd.detailEmployeePayment(fd.detailEmployeePayment().map((r) => ({ ...r, _status: 'edit', incomeAmount: a.tot.incomeAmount, pphAmount: a.pph, payablePphAmount: a.pph, amount: a.tot.amount,
        detailEmployeePaymentFee: r.detailEmployeePaymentFee.map((x) => ({ ...x, _status: 'edit', amount: a.fees[x.employeeFee?.name] ?? 0 })) })))
    } },
    reject: { body: (f) => json(f, { ...head(inputs.reject.description) }), ui: { arg: () => ({ description: inputs.reject.description }), mutate: (fd, a) => { fd.description(a.description) } } },
  }) },
  erp: (ctx) => { const k = `p4-epy1-${Date.now()}`, base = { date: inputs.date, year: inputs.year, month: inputs.month, payableAccount: inputs.payableAccount, pphAccount: inputs.pphAccount, feeAccounts: inputs.feeAccounts };
    const line = (fees) => [{ employee: inputs.employee, fees }]; return erpFlow(ctx, {
    date: inputs.date, defaults: { date: 'required', period: 'required', type: 'monthly (the only type)', payableAccount: 'required for the journal', pphAccount: 'required for the journal', branch: 'none (no branch)' },
    setup: async (send) => { // the demo's chart and employee, as Accurate holds them (the local seed has neither)
      for (const [no, name, accountType] of [['600004', 'Beban Gaji, Upah & Honorer', 'EXPENSE'], ['600006', 'Beban Transportasi Karyawan', 'EXPENSE'], ['210205', 'Hutang PPh 21', 'OTHER_CURRENT_LIABILITY']])
        await send('setup account', ['POST', '/ledger/commands', { type: 'OpenAccount', idempotencyKey: `p4-acct-${no}`, no, name, accountType }]);
      await send('setup employee', ['POST', '/employees', { no: inputs.employee, name: 'NL-PY50 Karyawan A', taxStatus: 'TK0' }]); return {} },
    create: () => ['POST', '/payroll/runs', { ...base, idempotencyKey: k, description: inputs.description, lines: line(inputs.fees) }],
    number: (r) => r.number,
    edit: (n) => ['PUT', `/payroll/runs/${n}`, { ...base, idempotencyKey: k + '-edit', description: inputs.edit.description, lines: line(inputs.edit.fees) }],
    reject: () => ['POST', '/payroll/runs', { ...base, idempotencyKey: k + '-bad', description: inputs.reject.description, lines: [] }],
    del: (n) => ['DELETE', `/payroll/runs/${n}`, { idempotencyKey: k + '-del' }],
    list: () => `/reports/general-ledger/journal-list?from=${inputs.date}&to=${inputs.date}`,
  }) },
  compare: (a, e) => compareFlow(a, e),
  accepted: {
    defaults: 'D1: the API takes every value explicitly; today\'s date, this month as the period, the payable and PPh accounts and the default branch are client defaults, not API defaults.',
    'header fields without an ERP counterpart': 'D2: attachments, comments, custom fields, terbilang, the pension/health due dates and accounts and the excess-PPh-to-allowance option are not in the ERP.',
  },
};
