import { z } from 'zod'

import type { accountType } from './ledger-es'

/** Accurate's label per ledger account type (same text as the API's ACCOUNT_TYPE_LABEL). */
export const accountTypeLabel: Record<z.infer<typeof accountType>, string> = {
  CASH_BANK: 'Kas & Bank', ACCOUNT_RECEIVABLE: 'Piutang Usaha', INVENTORY: 'Persediaan', OTHER_CURRENT_ASSET: 'Aset Lancar Lainnya',
  FIXED_ASSET: 'Aset Tetap', ACCUMULATED_DEPRECIATION: 'Akumulasi Penyusutan', OTHER_ASSET: 'Aset Lainnya', ACCOUNT_PAYABLE: 'Utang Usaha',
  OTHER_CURRENT_LIABILITY: 'Liabilitas Jangka Pendek', LONG_TERM_LIABILITY: 'Liabilitas Jangka Panjang', EQUITY: 'Modal',
  REVENUE: 'Pendapatan', COGS: 'Beban Pokok Penjualan', EXPENSE: 'Beban', OTHER_INCOME: 'Pendapatan Lainnya', OTHER_EXPENSE: 'Beban Lainnya',
}
export const accountTypes: string[] = Object.values(accountTypeLabel)

export const accountInputSchema = z
  .object({
    type: z.string().min(1),
    isSub: z.boolean(),
    parentId: z.string(),
    code: z.string().trim().min(1),
    name: z.string().trim().min(1),
    note: z.string(),
    bank: z.string(),
    accNo: z.string(),
    accName: z.string(),
    opening: z.number().min(0),
    openDate: z.string(),
    allUsers: z.boolean(),
    users: z.array(z.string()),
  })
  .refine((v) => !v.isSub || v.parentId, { path: ['parentId'] })
export type AccountInput = z.infer<typeof accountInputSchema>

export type Account = Omit<AccountInput, 'isSub' | 'parentId'> & { id: string; parentId: string | null; balance: number; contra?: boolean }
