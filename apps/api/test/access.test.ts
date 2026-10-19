import { afterAll, beforeAll, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import fx from '../../../docs/reports/fixtures/access-m49.json'
import { setBranchUsers, upsertAccessGroup } from '../src/access/service'
import * as A from '../src/reports/access'
import { fixtureDb } from './fixture-db'

// Manufaktur Demo (P3.4): Akses Grup NL-AG49 Grup Gudang (no members) and Kantor Pusat open to all users; the three access reports toEqual Accurate.
let f: Awaited<ReturnType<typeof fixtureDb>>
beforeAll(async () => {
  f = await fixtureDb('accm')
  for (const b of fx.branches) await setBranchUsers(f.db, b)
  for (const g of fx.groups) await upsertAccessGroup(f.db, g as any)
})
afterAll(() => f.close())

const capture = (id: string) => JSON.parse(readFileSync(`${import.meta.dir}/../../../docs/reports/captures/${id}.json`, 'utf8')).rows as string[][]
const FURNITURE = /^(Daftar Pengguna per Cabang|Daftar Akses Grup|Daftar Hak Akses per Pengguna|ACCURATE Accounting System Report|Tercetak pada |Halaman )/
/** Drops the title, page furniture, and the group header Accurate repeats at the top of every page. */
function body(rows: string[][]) {
  const out: string[][] = []
  let head = ''
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!
    if (r.length <= 2 && FURNITURE.test(r[0]!)) continue
    if (r[0] === 'Nama' && r[1] === ':') {
      const h = JSON.stringify(rows.slice(i, i + 3))
      if (h === head) { i += 2; continue }
      head = h
    }
    out.push(r)
  }
  return out
}

test('Daftar Akses Grup: NL-AG49 Grup Gudang, every catalog row, and the empty default-param capture', async () => {
  const groups = await A.loadAccessGroups(f.db)
  expect(A.accessGroupList(groups)).toEqual(body(fx.reports.AccessGroupPrivilegeListReport.rows))
  expect(A.accessGroupList([])).toEqual(body(capture('AccessGroupPrivilegeListReport')))
})

test('Daftar Hak Akses per Pengguna: no group members (Administrator only), and the default-param capture', async () => {
  const groups = await A.loadAccessGroups(f.db)
  expect(A.accessPrivilegeByUser(groups)).toEqual(body(fx.reports.AccessPrivilegeByUserListReport.rows))
  expect(A.accessPrivilegeByUser(groups)).toEqual(body(capture('AccessPrivilegeByUserListReport')))
})

test('Daftar Pengguna per Cabang: Kantor Pusat open to all users', async () => {
  expect(await A.userByBranchList(f.db)).toEqual(body(fx.reports.UserByBranchListReport.rows))
  expect(await A.userByBranchList(f.db)).toEqual(body(capture('UserByBranchListReport')))
})

test('privileges must be catalog keys with applicable actions; members and branches must exist', async () => {
  await expect(upsertAccessGroup(f.db, { name: 'NL-AG49 X', privileges: { nope: ['view'] } })).rejects.toThrow('tidak dikenal')
  await expect(upsertAccessGroup(f.db, { name: 'NL-AG49 X', privileges: { item_history: ['create'] } })).rejects.toThrow('tidak punya aksi create')
  await expect(upsertAccessGroup(f.db, { name: 'NL-AG49 X', users: ['nl-tester-0@example.test'] })).rejects.toThrow('tidak ditemukan')
  await expect(setBranchUsers(f.db, { name: 'NL-BR49 Tidak Ada' })).rejects.toThrow('tidak ditemukan')
})

test('member layouts (unverified against Accurate): placeholder users in a group and on a restricted branch', async () => {
  const { createUser } = await import('../src/auth')
  const db = (await fixtureDb('accm2'))
  try {
    await createUser(db.db, 'nl-tester-1@example.test', 'rahasia-123')
    await createUser(db.db, 'nl-tester-2@example.test', 'rahasia-123')
    await upsertAccessGroup(db.db, { name: 'NL-AG49 Grup Gudang', users: ['nl-tester-1@example.test'], privileges: { warehouse: ['create'] } })
    await setBranchUsers(db.db, { name: 'Kantor Pusat', allUsers: false, users: ['nl-tester-2@example.test'] })
    const groups = await A.loadAccessGroups(db.db)
    expect(A.accessGroupList(groups)[0]).toEqual(['Nama', ':', 'NL-AG49 Grup Gudang', 'Pengguna', ':', 'nl-tester-1@example.test'])
    expect(A.accessPrivilegeByUser(groups)).toEqual(A.accessGroupList(groups))
    expect(A.accessPrivilegeByUser(groups, [-1])).toEqual(A.accessGroupList([]))
    expect(await A.userByBranchList(db.db)).toEqual([['Pengguna', 'Email', 'No Handphone'], ['Kantor Pusat'], ['nl-tester-2@example.test', 'nl-tester-2@example.test']])
  } finally { await db.close() }
})

test('HTTP: access routes serve the same rows and login is unchanged', async () => {
  const { createApp } = await import('../src/app')
  const { createUser } = await import('../src/auth')
  const app = createApp(f.db)
  await createUser(f.db, 'nl-tester-acc@example.test', 'rahasia-123')
  const login = await app.request('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'nl-tester-acc@example.test', password: 'rahasia-123' }) })
  const cookie = login.headers.get('set-cookie')!.split(';')[0]!
  const get = async (p: string) => (await app.request(`/api/reports/access/${p}`, { headers: { cookie } })).json()
  expect(await get('group-privileges')).toEqual(body(fx.reports.AccessGroupPrivilegeListReport.rows))
  expect(await get('privileges-by-user')).toEqual(body(fx.reports.AccessPrivilegeByUserListReport.rows))
  expect(await get('user-by-branch')).toEqual(body(fx.reports.UserByBranchListReport.rows))
  expect((await app.request('/api/reports/access/user-by-branch')).status).toBe(401)
})
