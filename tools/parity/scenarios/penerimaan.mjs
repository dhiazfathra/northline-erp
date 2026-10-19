// Kas & Bank > Penerimaan (cash): create, edit, save without lines rejected, delete; journal after edit and after delete.
import { cashScenario } from './_cash.mjs';
export default cashScenario({ kind: 'DEP', title: 'Penerimaan', dir: 'kas-bank/penerimaan', mod: 'accurate__cash-bank__other-deposit',
  date: '2051-01-07', code: 'NL-P4-OD1', account: 'NL-T1-4001', amount: 400000, editAmount: 425000 });
