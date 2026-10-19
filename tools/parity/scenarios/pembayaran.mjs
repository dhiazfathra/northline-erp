// Kas & Bank > Pembayaran (cash): create, edit, save without lines rejected, delete; journal after edit and after delete.
import { cashScenario } from './_cash.mjs';
export default cashScenario({ kind: 'PAY', title: 'Pembayaran', dir: 'kas-bank/pembayaran', mod: 'accurate__cash-bank__other-payment',
  date: '2051-01-06', code: 'NL-P4-OP1', account: 'NL-T1-6001', amount: 250000, editAmount: 275000 });
