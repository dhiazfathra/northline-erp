// Buku Besar > Jurnal Umum: create, edit, unbalanced save rejected, delete; Keseluruhan Jurnal after edit and after delete.
import { accFlow, compareFlow, dmy, erpFlow, erpJournal, today } from '../lib.mjs';

const MOD = 'accurate__general-ledger__journal-voucher';
const ACC = { 'NL-T1-6001': 701, 'NL-T1-2101': 652 }; // Manufaktur Demo glAccount ids (search-glaccount.do)
const inputs = {
  date: '2051-01-05', description: 'NL-P4-JV1',
  lines: [{ account: 'NL-T1-6001', side: 'DEBIT', amount: 150000, memo: 'NL-P4-JV1 beban' }, { account: 'NL-T1-2101', side: 'CREDIT', amount: 150000, memo: 'NL-P4-JV1 utang' }],
  edit: { description: 'NL-P4-JV1 edit', amount: 175000 },
  reject: { description: 'NL-P4-JV1 tidak seimbang', lines: [{ account: 'NL-T1-6001', side: 'DEBIT', amount: 100000 }, { account: 'NL-T1-2101', side: 'CREDIT', amount: 50000 }] },
};
const accLines = (lines) => Object.assign({}, ...lines.map((l, i) => {
  const p = `param.detailJournalVoucher[${i}].`;
  return { [p + 'glAccountId']: ACC[l.account], [p + 'amountType']: l.side, [p + 'amount']: l.amount, [p + (l.side === 'DEBIT' ? 'debitAmount' : 'creditAmount')]: l.amount,
    [p + 'memo']: l.memo ?? '', [p + 'seq']: i + 1, [p + 'branchId']: 50, [p + '_status']: 'insert' };
}));

export default {
  title: 'Jurnal Umum', module: 'Buku Besar', dir: 'buku-besar/jurnal-umum', mod: MOD,
  accuratePath: 'Buku Besar > Jurnal Umum', erpRoute: 'POST /api/ledger/commands (PostJournal, EditJournal, DeleteJournal)',
  steps: ['Create a two-line journal (Dr NL-T1 Beban / Cr NL-T1 Utang Lain 150.000) dated 05 Jan 2051.',
    'Edit it: new description, both lines 175.000.', 'Read Keseluruhan Jurnal for the day.',
    'Save an unbalanced journal (Dr 100.000 / Cr 50.000): rejected.', 'Delete the journal; read the journal and the list again.'],
  inputs,
  accurate: (ctx) => accFlow(ctx, {
    mod: MOD, date: inputs.date, keyword: inputs.description, rowsKey: 'detailJournalVoucher',
    fieldMap: { number: 'number', transDate: 'date', description: 'description', branch: 'branch' },
    defaults: (b) => ({ date: b['param.transDate'] === today() ? 'today' : b['param.transDate'], branch: b['param.branchId'] === 50 ? 'Kantor Pusat' : b['param.branchId'] }),
    create: () => ({ 'param.transDate': dmy(inputs.date), 'param.description': inputs.description, ...accLines(inputs.lines) }),
    edit: { arg: inputs.edit, mutate: (fd, a) => {
      fd.description(a.description);
      // detail rows are plain objects; a changed row is marked 'edit' (the form's row states: browse/edit/insert/delete)
      fd.detailJournalVoucher(fd.detailJournalVoucher().map((r) => ({ ...r, amount: a.amount, primeAmount: a.amount, [r.amountType === 'DEBIT' ? 'debitAmount' : 'creditAmount']: a.amount, _status: 'edit' })))
    } },
    reject: {
      body: () => ({ 'param.transDate': dmy(inputs.date), 'param.description': inputs.reject.description, ...accLines(inputs.reject.lines) }),
      ui: { arg: (tpl) => ({ date: dmy(inputs.date), description: inputs.reject.description, rows: tpl, lines: inputs.reject.lines }), mutate: (fd, a) => {
        fd.description(a.description); fd.transDate(a.date);
        fd.detailJournalVoucher(a.rows.map((r, i) => { const l = a.lines[i], { id, optLock, journalId, ...rest } = r;
          return { ...rest, amount: l.amount, primeAmount: l.amount, [l.side === 'DEBIT' ? 'debitAmount' : 'creditAmount']: l.amount, _status: 'insert' } }))
      } },
    },
  }),
  erp: (ctx) => { const id = crypto.randomUUID(), k = `p4-jv1-${Date.now()}`; return erpFlow(ctx, {
    date: inputs.date, defaults: { date: 'required', branch: 'none (no branch)' },
    create: () => ['POST', '/ledger/commands', { type: 'PostJournal', idempotencyKey: k, journalId: id, sourceType: 'JV', date: inputs.date, description: inputs.description, lines: inputs.lines }],
    number: async () => JSON.stringify(await erpJournal(inputs.date, inputs.date)).match(/JV\.\d{4}\.\d{2}\.\d{5}/)?.[0],
    edit: () => ['POST', '/ledger/commands', { type: 'EditJournal', idempotencyKey: k + '-edit', journalId: id, date: inputs.date, description: inputs.edit.description, lines: inputs.lines.map((l) => ({ ...l, amount: inputs.edit.amount })) }],
    reject: () => ['POST', '/ledger/commands', { type: 'PostJournal', idempotencyKey: k + '-bad', journalId: crypto.randomUUID(), sourceType: 'JV', date: inputs.date, description: inputs.reject.description, lines: inputs.reject.lines }],
    del: () => ['POST', '/ledger/commands', { type: 'DeleteJournal', idempotencyKey: k + '-del', journalId: id }],
    list: () => `/reports/general-ledger/journal-list?from=${inputs.date}&to=${inputs.date}`,
  }) },
  compare: (a, e) => compareFlow(a, e),
  accepted: {
    defaults: 'D1: the API takes every value explicitly; today\'s date and the default branch are client defaults, not API defaults.',
    'header fields without an ERP counterpart': 'D2: attachments, comments, custom fields and foreign-currency journals are not in the ERP.',
  },
};
