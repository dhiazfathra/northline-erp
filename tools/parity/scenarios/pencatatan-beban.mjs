// Buku Besar > Pencatatan Beban: create, edit, save without lines rejected, delete; journal after edit and after delete.
import { accFlow, compareFlow, dmy, erpFlow, today } from '../lib.mjs';

const MOD = 'accurate__general-ledger__expense-accrual';
const ACC = { 210206: 302, 600011: 114 }; // Manufaktur Demo glAccount ids (search-glaccount.do)
const inputs = { date: '2051-02-02', dueDate: '2051-03-02', payableAccount: '210206', description: 'NL-P4-EA1', lines: [{ account: '600011', amount: 120000 }],
  edit: { description: 'NL-P4-EA1 edit', amount: 135000 }, reject: { description: 'NL-P4-EA1 tanpa rincian' } };
const head = (d) => ({ 'param.transDate': dmy(inputs.date), 'param.dueDate': dmy(inputs.dueDate), 'param.expensePayableId': ACC[inputs.payableAccount], 'param.description': d });
const accLines = (lines) => Object.assign({}, ...lines.map((l, i) => {
  const p = `param.detailAccount[${i}].`;
  return { [p + 'accountId']: ACC[l.account], [p + 'amount']: l.amount, [p + 'seq']: i + 1, [p + '_status']: 'insert' };
}));
const path = '/expense-accruals';

export default {
  title: 'Pencatatan Beban', module: 'Buku Besar', dir: 'buku-besar/pencatatan-beban', mod: MOD,
  accuratePath: 'Buku Besar > Pencatatan Beban', erpRoute: 'POST/PUT/DELETE /api/expense-accruals',
  steps: ['Create an expense accrual dated 02 Feb 2051, due 02 Mar 2051, payable 210206: one line 600011 Beban Listrik 120.000.',
    'Edit it: new description, line 135.000.', 'Read Keseluruhan Jurnal for the day.', 'Save an accrual without lines: rejected.',
    'Delete it; read the journal and the list again.'],
  inputs,
  accurate: (ctx) => accFlow(ctx, {
    mod: MOD, date: inputs.date, keyword: inputs.description, rowsKey: 'detailAccount',
    fieldMap: { number: 'number', transDate: 'date', dueDate: 'dueDate', expensePayable: 'payableAccount', description: 'description', amount: 'total (computed)', paidAmount: 'payments (computed)', rate: 'rate', branch: 'branch' },
    defaults: (b) => ({ date: b['param.transDate'] === today() ? 'today' : b['param.transDate'], dueDate: b['param.dueDate'] === today() ? 'today' : b['param.dueDate'], payableAccount: b['param.expensePayableId'] || 'none', branch: b['param.branchId'] === 50 ? 'Kantor Pusat' : b['param.branchId'] }),
    create: () => ({ ...head(inputs.description), ...accLines(inputs.lines) }),
    edit: { arg: inputs.edit, mutate: (fd, a) => { fd.description(a.description); fd.detailAccount(fd.detailAccount().map((r) => ({ ...r, amount: a.amount, _status: 'edit' }))) } },
    reject: { body: () => head(inputs.reject.description), ui: { arg: () => ({ description: inputs.reject.description }), mutate: (fd, a) => { fd.description(a.description) } } },
  }),
  erp: (ctx) => { const k = `p4-ea1-${Date.now()}`, base = { date: inputs.date, dueDate: inputs.dueDate, payableAccount: inputs.payableAccount }; return erpFlow(ctx, {
    date: inputs.date, defaults: { date: 'required', dueDate: 'required', payableAccount: 'required', branch: 'none (no branch)' },
    create: () => ['POST', path, { ...base, idempotencyKey: k, description: inputs.description, lines: inputs.lines }],
    number: (r) => r.number,
    edit: (n) => ['PUT', `${path}/${n}`, { ...base, idempotencyKey: k + '-edit', description: inputs.edit.description, lines: inputs.lines.map((l) => ({ ...l, amount: inputs.edit.amount })) }],
    reject: () => ['POST', path, { ...base, idempotencyKey: k + '-bad', description: inputs.reject.description, lines: [] }],
    del: (n) => ['DELETE', `${path}/${n}`, { idempotencyKey: k + '-del' }],
    list: () => `/reports/general-ledger/journal-list?from=${inputs.date}&to=${inputs.date}`,
  }) },
  compare: (a, e) => compareFlow(a, e),
  accepted: {
    defaults: 'D1: the API takes every value explicitly; today\'s date (transaction and due date), the payable account and the default branch are client defaults, not API defaults.',
    'header fields without an ERP counterpart': 'D2: attachments, comments, custom fields and foreign currency are not in the ERP.',
  },
};
