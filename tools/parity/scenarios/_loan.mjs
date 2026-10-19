// Pinjaman Karyawan inputs shared by the loan and the disbursement scenarios (Manufaktur Demo ids).
import { dmy } from '../lib.mjs';
export const LOAN_MOD = 'accurate__cash-bank__employee-loan';
export const IDS = { employee: 50, receivable: 651, penalty: 700, bank: 650 }; // E.00001, NL-T1-1201, NL-T1-4001, NL-T1-1101
/** Flat body of a loan: Accurate requires the employee's bank details, the receivable and the penalty-income accounts. */
// 'param.number' must be non-empty, yet Accurate assigns EPL.yyyy.mm.nnnnn from the auto-number regardless (seen 2026-10-19).
export const accLoan = ({ date, start, description, amount, employeeId = IDS.employee }) => ({ 'param.transDate': dmy(date), 'param.startDateInstallment': dmy(start),
  'param.number': description, 'param.employeeId': employeeId, 'param.description': description, 'param.loanAmount': amount, 'param.loanDuration': 3, 'param.installmentType': 'NOINTEREST',
  'param.receivableAccountId': IDS.receivable, 'param.penaltyAccountId': IDS.penalty, 'param.bankAccount': '000', 'param.bankAccountName': 'NL-P4', 'param.bankName': 'Bank Uji' });
export const erpLoan = ({ date, description, amount }) => ({ employee: 'E.00001', date, description, amount, receivableAccount: 'NL-T1-1201' });
