import { sql } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from '../db'
import { DomainError } from '../ledger/deciders'
import catalog from './privilege-catalog.json'

// Users and access (P3.4; fixtures/access-m49.json). Data only: nothing here gates a route yet (P5).
// Catalog rows are [heading] or [label, mask, key]; mask columns = Aktif, Buat, Ubah, Hapus, Lihat ('x' = applicable).
export const ACTIONS = ['enable', 'create', 'edit', 'delete', 'view'] as const
export const PRIVILEGES = new Map((catalog as string[][]).filter(r => r.length === 3).map(r => [r[2]!, r[1]!]))

const groupInput = z.object({
  name: z.string().min(1, 'Nama harus diisi'),
  users: z.array(z.string()).default([]), // user emails
  restrictionDayType: z.enum(['MONDAYFRIDAY']).default('MONDAYFRIDAY'),
  privileges: z.record(z.string(), z.array(z.enum(ACTIONS))).default({}),
})

/** Akses Grup: creates or replaces a group, its members and its privileges (catalog keys, applicable actions only). */
export async function upsertAccessGroup(db: Db, raw: z.input<typeof groupInput>) {
  const g = groupInput.parse(raw)
  for (const [key, acts] of Object.entries(g.privileges)) {
    const mask = PRIVILEGES.get(key)
    if (!mask) throw new DomainError(`Hak akses ${key} tidak dikenal`)
    for (const a of acts) if (mask[ACTIONS.indexOf(a)] !== 'x') throw new DomainError(`Hak akses ${key} tidak punya aksi ${a}`)
  }
  await db.transaction(async tx => {
    await tx.execute(sql`INSERT INTO access_groups (name, restriction_days, privileges) VALUES (${g.name}, ${g.restrictionDayType}, ${JSON.stringify(g.privileges)}::jsonb)
      ON CONFLICT (name) DO UPDATE SET restriction_days = EXCLUDED.restriction_days, privileges = EXCLUDED.privileges`)
    await tx.execute(sql`DELETE FROM access_group_users WHERE group_name = ${g.name}`)
    for (const email of g.users) {
      const [u] = await tx.execute(sql`SELECT id FROM users WHERE email = ${email.toLowerCase()}`)
      if (!u) throw new DomainError(`Pengguna ${email} tidak ditemukan`)
      await tx.execute(sql`INSERT INTO access_group_users VALUES (${g.name}, ${u.id})`)
    }
  })
}

const branchInput = z.object({ name: z.string().min(1), allUsers: z.boolean().default(true), users: z.array(z.string()).default([]) })

/** Which users a branch admits: everyone, or the listed emails. */
export async function setBranchUsers(db: Db, raw: z.input<typeof branchInput>) {
  const b = branchInput.parse(raw)
  await db.transaction(async tx => {
    const [br] = await tx.execute(sql`UPDATE branches SET all_users = ${b.allUsers} WHERE name = ${b.name} RETURNING name`)
    if (!br) throw new DomainError(`Cabang ${b.name} tidak ditemukan`)
    await tx.execute(sql`DELETE FROM branch_users WHERE branch = ${b.name}`)
    if (!b.allUsers) for (const email of b.users) {
      const [u] = await tx.execute(sql`SELECT id FROM users WHERE email = ${email.toLowerCase()}`)
      if (!u) throw new DomainError(`Pengguna ${email} tidak ditemukan`)
      await tx.execute(sql`INSERT INTO branch_users VALUES (${b.name}, ${u.id})`)
    }
  })
}
