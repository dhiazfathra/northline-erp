import { sql } from 'drizzle-orm'
import type { Db } from '../db'
import catalog from '../access/privilege-catalog.json'
import { ACTIONS } from '../access/service'

// Daftar Pengguna per Cabang, Daftar Akses Grup, Daftar Hak Akses per Pengguna (Lain-lain), verified on Manufaktur Demo
// (fixtures/access-m49.json). Only the no-member layouts were capturable (no users invited); member lines are unverified.
const DAYS: Record<string, string> = { MONDAYFRIDAY: 'Senin-Jumat' }
const HEAD = ['Hak Akses', 'Aktif', 'Buat', 'Ubah', 'Hapus', 'Lihat']

export interface AccessGroup { name: string; days: string; from: string; to: string; privileges: Record<string, string[]>; users: { id: number; name: string }[] }

export async function loadAccessGroups(db: Db): Promise<AccessGroup[]> {
  const members = await db.execute(sql`SELECT m.group_name, u.id, COALESCE(u.name, u.email) AS name FROM access_group_users m JOIN users u ON u.id = m.user_id ORDER BY name`)
  return (await db.execute(sql`SELECT * FROM access_groups ORDER BY name`)).map(g => ({ name: g.name as string, days: g.restriction_days as string,
    from: g.restriction_from as string, to: g.restriction_to as string, privileges: g.privileges as Record<string, string[]>,
    users: members.filter(m => m.group_name === g.name).map(m => ({ id: Number(m.id), name: m.name as string })) }))
}

/** One group's block: header, then every catalog row with YA/TIDAK where the action applies and '-' where it does not. */
function block(g: AccessGroup, users: string[]): string[][] {
  return [['Nama', ':', g.name, 'Pengguna', ':', ...users.length ? [users.join(', ')] : []], ['Pembatasan Akses', ':', `${DAYS[g.days]}, ${g.from} - ${g.to}`], HEAD,
    ...(catalog as string[][]).map(r => r.length === 1 ? r : [r[0]!, ...[...r[1]!].map((m, i) => m !== 'x' ? '-' : g.privileges[r[2]!]?.includes(ACTIONS[i]!) ? 'YA' : 'TIDAK')])]
}
const EMPTY = [['Nama', ':', 'Pengguna', ':'], ['Pembatasan Akses', ':'], HEAD]

export const accessGroupList = (groups: AccessGroup[]) => groups.length ? groups.flatMap(g => block(g, g.users.map(u => u.name))) : EMPTY

/** Per user (selected ids, or all) of every group they belong to; users in no group (administrators) are not listed. */
export function accessPrivilegeByUser(groups: AccessGroup[], selected: number[] = []) {
  const rows = groups.flatMap(g => g.users.filter(u => !selected.length || selected.includes(u.id)).map(u => ({ u, g })))
    .sort((a, b) => a.u.name.localeCompare(b.u.name)).flatMap(({ u, g }) => block(g, [u.name]))
  return rows.length ? rows : EMPTY
}

/** Branches by name; a branch open to everyone prints Semua Pengguna, otherwise its users (empty cells print nothing). */
export async function userByBranchList(db: Db) {
  const users = await db.execute(sql`SELECT b.branch, COALESCE(u.name, u.email) AS name, u.email, u.mobile FROM branch_users b JOIN users u ON u.id = b.user_id ORDER BY name`)
  return [['Pengguna', 'Email', 'No Handphone'], ...(await db.execute(sql`SELECT name, all_users FROM branches ORDER BY is_default DESC, name`)).flatMap(b => [[b.name as string],
    ...b.all_users ? [['Semua Pengguna']] : users.filter(u => u.branch === b.name).map(u => [u.name, u.email, u.mobile].filter(Boolean).map(String))])]
}
