// Kas & Bank > Pembayaran / Penerimaan (cash): one builder, the two forms differ in module, kind and journal side.
import { accFlow, compareFlow, dmy, erpFlow, today } from '../lib.mjs';

const ACC = { 'NL-T1-1101': 650, 'NL-T1-6001': 701, 'NL-T1-4001': 700 }; // Manufaktur Demo glAccount ids

export function cashScenario({ kind, title, dir, mod, date, code, account, amount, editAmount }) {
  const pay = kind === 'PAY';
  const inputs = { date, bank: 'NL-T1-1101', description: code, lines: [{ account, amount, notes: `${code} ${pay ? 'beban' : 'pendapatan'}` }],
    edit: { description: `${code} edit`, amount: editAmount }, reject: { description: `${code} tanpa rincian`, lines: [] } };
  const accLines = (lines) => Object.assign({}, ...lines.map((l, i) => {
    const p = `param.detailAccount[${i}].`;
    return { [p + 'accountId']: ACC[l.account], [p + 'amount']: l.amount, [p + 'detailName']: l.notes, [p + 'seq']: i + 1, [p + '_status']: 'insert' };
  }));
  const head = (d) => ({ 'param.transDate': dmy(date), 'param.chequeDate': dmy(date), 'param.bankId': ACC[inputs.bank], 'param.description': d,
    'param.typeAutoNumber': 400 }); // the bank's own auto-number (NL-T1 Kas), which the form picks when the bank is chosen
  const body = (d, lines) => ({ idempotencyKey: '', kind, bank: inputs.bank, date, description: d, lines });
  const path = '/cash-bank/documents';
  return {
    title, module: 'Kas & Bank', dir, mod, accuratePath: `Kas & Bank > ${title}`,
    erpRoute: `POST/PUT/DELETE /api/cash-bank/documents (kind=${kind})`,
    steps: [`Create a ${title} from NL-T1 Kas, one line ${account} ${amount.toLocaleString('id-ID')}, dated ${date}.`,
      `Edit it: new description, line ${editAmount.toLocaleString('id-ID')}.`, 'Read Keseluruhan Jurnal for the day.',
      `Save a ${title} without lines: rejected.`, `Delete it; read the journal and the list again.`],
    inputs,
    accurate: (ctx) => accFlow(ctx, {
      mod, date, keyword: code, rowsKey: 'detailAccount',
      fieldMap: { number: 'number', transDate: 'date', bank: 'bank', description: 'description', chequeNo: 'chequeNo', chequeDate: 'date', amount: 'total (computed)', branch: 'branch' },
      defaults: (b) => ({ date: b['param.transDate'] === today() ? 'today' : b['param.transDate'], bank: b['param.bankId'] || 'none', branch: b['param.branchId'] === 50 ? 'Kantor Pusat' : b['param.branchId'] }),
      create: () => ({ ...head(code), ...accLines(inputs.lines) }),
      edit: { arg: inputs.edit, mutate: (fd, a) => { fd.description(a.description); fd.detailAccount(fd.detailAccount().map((r) => ({ ...r, amount: a.amount, _status: 'edit' }))) } },
      reject: {
        body: () => head(inputs.reject.description),
        ui: { arg: () => ({ description: inputs.reject.description }), mutate: (fd, a) => { fd.description(a.description) } },
      },
    }),
    erp: (ctx) => { const k = `p4-${code}-${Date.now()}`; return erpFlow(ctx, {
      date, defaults: { date: 'required', bank: 'none', branch: 'none (no branch)' },
      create: () => ['POST', path, { ...body(code, inputs.lines), idempotencyKey: k }],
      number: (r) => r.number,
      edit: (n) => ['PUT', `${path}/${n}`, { ...body(inputs.edit.description, inputs.lines.map((l) => ({ ...l, amount: editAmount }))), idempotencyKey: k + '-edit' }],
      reject: () => ['POST', path, { ...body(inputs.reject.description, []), idempotencyKey: k + '-bad' }],
      del: (n) => ['DELETE', `${path}/${n}`, { idempotencyKey: k + '-del' }],
      list: () => `/reports/general-ledger/journal-list?from=${date}&to=${date}`,
    }) },
    compare: (a, e) => compareFlow(a, e),
    accepted: {
      defaults: 'D1: the API takes every value explicitly; today\'s date and the default branch are client defaults, not API defaults.',
      'header fields without an ERP counterpart': 'D2: attachments, comments, custom fields, payee and terbilang, foreign currency and rate, SSP numbers, void-cheque, reconciliation and amortization flags are not in the ERP.',
    },
  };
}
