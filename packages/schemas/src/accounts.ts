import { z } from 'zod'

export const accountTypes = ['Kas & Bank', 'Piutang Usaha', 'Persediaan', 'Aset Tetap', 'Utang Usaha', 'Ekuitas', 'Pendapatan', 'Beban'] as const

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

export type Account = Omit<AccountInput, 'isSub' | 'parentId'> & { id: string; parentId: string | null; balance: number }
