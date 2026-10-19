import { sql } from 'drizzle-orm'
import type { Db } from '../db'
import { DomainError } from '../ledger/deciders'
import { profitLossByDim, STANDARD, type DimLine } from './dimensions'
import type { StatementOptions } from './financial-statements'
import { fmtDate, typeLabel } from './general-ledger'
import { formatIdr, type TbAccount } from './trial-balance'

// Proyek Kontraktor reports (ADR-0038); rules in docs/reports/<planId>.md, verified on Kontraktor Demo. Functions return the
// report body: title lines, parameter echo and per-page footers are page furniture. Kontraktor Demo prints id-ID numbers.

export interface Resource { id: number; name: string; unit: string; qty: number; plan: number }
export interface Task { id: number; group: string; groupName: string; name: string; volume: number; unit: string; unitCost: number; unitPrice: number; start: string | null; end: string | null; resources: Resource[] }
export interface Rab { number: string; date: string; feePct: number; description: string; tasks: Task[] }
export interface Project {
  no: string; name: string; targetStart: string; finishDate: string | null; description: string; wip: string; rab?: Rab
  usages: { number: string; date: string; description: string; lines: { task: number; resource: number | null; name: string; qty: number; unit: string; warehouse: string; amount: number }[] }[]
  costs: { resource: number | null; name: string; qty: number; amount: number }[]
  returns: { name: string; qty: number; amount: number }[]
  surveys: { number: string; date: string; surveyor: string; description: string; lines: { task: number; qty: number; pct: number }[] }[]
  billings: { invoice: string; group: string; date: string }[]
  journal: { number: string; date: string; sourceType: string; description: string; account: string; accountName: string; accountType: string; debit: number; credit: number }[]
}

export async function loadContractor(db: Db): Promise<Project[]> {
  const q = async (s: ReturnType<typeof sql>) => (await db.execute(s)) as any[]
  const [ps, rabs, tasks, res, us, uls, costs, rets, svs, sls, bills, js] = await Promise.all([
    q(sql`SELECT no, name, to_char(target_start,'YYYY-MM-DD') AS ts, to_char(finish_date,'YYYY-MM-DD') AS fd, description, wip_account FROM contractor_projects ORDER BY no`),
    q(sql`SELECT number, project, to_char(date,'YYYY-MM-DD') AS date, fee_pct, description FROM rabs ORDER BY number`),
    q(sql`SELECT id, rab, group_no, group_name, name, volume, unit, unit_cost, unit_price, to_char(start_date,'YYYY-MM-DD') AS sd, to_char(end_date,'YYYY-MM-DD') AS ed FROM rab_tasks ORDER BY rab, seq`),
    q(sql`SELECT id, task_id, name, unit, quantity, unit_cost FROM rab_resources ORDER BY task_id, seq`),
    q(sql`SELECT number, project, to_char(date,'YYYY-MM-DD') AS date, description FROM material_usages ORDER BY date, number`),
    q(sql`SELECT l.usage_number, l.task_id, l.resource_id, i.name, l.quantity, l.unit, l.warehouse, l.amount FROM material_usage_lines l JOIN items i ON i.no = l.item_no ORDER BY l.usage_number, l.seq`),
    q(sql`SELECT project, resource_id, name, quantity, amount FROM project_costs ORDER BY date, doc_number, seq`),
    q(sql`SELECT c.project, i.name, r.quantity, r.amount FROM project_completion_returns r JOIN project_completions c ON c.number = r.completion JOIN items i ON i.no = r.item_no ORDER BY r.completion, r.seq`),
    q(sql`SELECT number, project, to_char(date,'YYYY-MM-DD') AS date, surveyor, description FROM surveys ORDER BY date, number`),
    q(sql`SELECT survey_number, task_id, progress_qty, portion_pct FROM survey_lines`),
    q(sql`SELECT invoice, project, group_no, to_char(date,'YYYY-MM-DD') AS date FROM project_billings ORDER BY date, invoice`),
    q(sql`SELECT l.contractor_project, j.number, to_char(j.date,'YYYY-MM-DD') AS date, j.source_type, j.description, l.account_no, a.name, a.type, l.debit, l.credit
      FROM journal_lines l JOIN journals j USING (journal_id) JOIN accounts a ON a.no = l.account_no WHERE l.contractor_project IS NOT NULL ORDER BY j.date, j.number, l.line_no`),
  ])
  const allTasks: Task[] = tasks.map(t => ({ id: Number(t.id), group: t.group_no, groupName: t.group_name, name: t.name, volume: Number(t.volume), unit: t.unit, unitCost: Number(t.unit_cost),
    unitPrice: Number(t.unit_price), start: t.sd, end: t.ed, rab: t.rab,
    resources: res.filter(r => r.task_id === t.id).map(r => ({ id: Number(r.id), name: r.name, unit: r.unit, qty: Number(r.quantity), plan: Math.round(Number(r.quantity) * Number(r.unit_cost)) })) }))
  return ps.map(p => {
    const r = rabs.find(x => x.project === p.no)
    return {
      no: p.no, name: p.name, targetStart: p.ts, finishDate: p.fd, description: p.description, wip: p.wip_account,
      rab: r && { number: r.number, date: r.date, feePct: Number(r.fee_pct), description: r.description, tasks: allTasks.filter(t => (t as any).rab === r.number) },
      usages: us.filter(u => u.project === p.no).map(u => ({ number: u.number, date: u.date, description: u.description,
        lines: uls.filter(l => l.usage_number === u.number).map(l => ({ task: Number(l.task_id), resource: l.resource_id === null ? null : Number(l.resource_id), name: l.name, qty: Number(l.quantity), unit: l.unit, warehouse: l.warehouse, amount: Number(l.amount) })) })),
      costs: costs.filter(c => c.project === p.no).map(c => ({ resource: c.resource_id === null ? null : Number(c.resource_id), name: c.name, qty: Number(c.quantity), amount: Number(c.amount) })),
      returns: rets.filter(x => x.project === p.no).map(x => ({ name: x.name, qty: Number(x.quantity), amount: Number(x.amount) })),
      surveys: svs.filter(s => s.project === p.no).map(s => ({ number: s.number, date: s.date, surveyor: s.surveyor, description: s.description,
        lines: sls.filter(l => l.survey_number === s.number).map(l => ({ task: Number(l.task_id), qty: Number(l.progress_qty), pct: Number(l.portion_pct) })) })),
      billings: bills.filter(b => b.project === p.no).map(b => ({ invoice: b.invoice, group: b.group_no, date: b.date })),
      journal: js.filter(l => l.contractor_project === p.no).map(l => ({ number: l.number ?? '', date: l.date, sourceType: l.source_type, description: l.description, account: l.account_no,
        accountName: l.name, accountType: l.type, debit: Number(l.debit), credit: Number(l.credit) })),
    }
  })
}

const row = (...cells: string[]) => cells.filter(c => c !== '')
const num = formatIdr
/** Quantities and percentages: plain, id-style decimal comma. */
const qty = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',')
const inRange = (d: string, from: string, to: string) => d >= from && d <= to
const groups = (tasks: Task[]) => [...new Set(tasks.map(t => t.group))].map(g => ({ no: g, name: tasks.find(t => t.group === g)!.groupName, tasks: tasks.filter(t => t.group === g) }))

export function byNo(ps: Project[], no: string) {
  const p = ps.find(x => x.no === no)
  if (!p) throw new DomainError('Proyek harus diisi')
  return p
}

/** RAB totals (ADR-0038): work = Σ volume × unit cost; selling = Σ volume × unit price; fee = selling × fee %; Total RAB = selling + fee. */
export function rabTotals(r: Rab) {
  const work = r.tasks.reduce((s, t) => s + Math.round(t.volume * t.unitCost), 0), selling = r.tasks.reduce((s, t) => s + Math.round(t.volume * t.unitPrice), 0)
  const fee = Math.round(selling * r.feePct / 100)
  return { work, buffer: selling - work, selling, fee, grand: selling + fee }
}

/** Daftar Proyek Kontraktor: projects whose Target Mulai is in range (inferred filter column). */
export const projectContractorList = (ps: Project[], from: string, to: string) => [
  ['No. Proyek', 'Nama', 'Target Mulai', 'Tanggal Selesai', 'Keterangan'],
  ...ps.filter(p => inRange(p.targetStart, from, to)).map(p => row(p.no, p.name, fmtDate(p.targetStart), p.finishDate ? fmtDate(p.finishDate) : '', p.description.replace(/\r?\n/g, ''))),
]

/** Daftar Anggaran: one row per RAB dated in range; Progress and Keterangan print empty. */
export const contractorBudgetPlan = (ps: Project[], from: string, to: string) => [
  ['Tanggal', 'Nomor #', 'No. Proyek', 'Nama Proyek Kontraktor', 'Total RAB', 'Progress', 'Keterangan'],
  ...ps.filter(p => p.rab && inRange(p.rab.date, from, to)).map(p => row(fmtDate(p.rab!.date), p.rab!.number, p.no, p.name, num(rabTotals(p.rab!).grand), p.rab!.description)),
]

/** Anggaran & Realisasi Proyek: plan (resource qty × cost) vs actual (MEQ + project cost lines) per resource; then out-of-budget lines. */
export function projectBudgetComparison(p: Project): string[][] {
  const out = [['Bahan Baku dan Biaya', 'Satuan', 'Kuantitas (Rencana)', 'Total Biaya (Rencana)', 'Kuantitas (Realisasi)', 'Total Biaya (Realisasi)', 'Selisih']]
  const actual = [...p.usages.flatMap(u => u.lines.map(l => ({ resource: l.resource, qty: l.qty, amount: l.amount }))), ...p.costs]
  let plan = 0, real = 0
  if (p.rab) {
    out.push([`RAB : ${p.rab.number}`])
    for (const g of groups(p.rab.tasks)) {
      out.push([`${g.no}. ${g.name}`])
      let gp = 0, gr = 0
      for (const t of g.tasks) {
        out.push([t.name])
        let tp = 0, tr = 0
        for (const r of t.resources) {
          const a = actual.filter(x => x.resource === r.id), q = a.reduce((s, x) => s + x.qty, 0), amt = a.reduce((s, x) => s + x.amount, 0)
          out.push(row(r.name, r.unit, qty(r.qty), num(r.plan), qty(q), num(amt), num(amt - r.plan)))
          tp += r.plan; tr += amt
        }
        out.push([num(tp), num(tr), num(tr - tp)])
        gp += tp; gr += tr
      }
      out.push([`Total ${g.no}. ${g.name}`, num(gp), num(gr), num(gr - gp)])
      plan += gp; real += gr
    }
  }
  const goods = p.returns.map(r => ({ name: `${r.name} (Sisa Barang)`, qty: -r.qty, amount: -r.amount })), costs = p.costs.filter(c => c.resource === null)
  if (goods.length || costs.length) {
    out.push(['Pengeluaran di Luar Anggaran'])
    for (const [label, xs] of [['Rincian Barang', goods], ['Rincian Biaya', costs]] as const) {
      if (!xs.length) continue
      out.push([label])
      for (const x of xs) out.push([x.name, '0', '0', qty(x.qty), num(x.amount), num(x.amount)])
      const s = xs.reduce((a, x) => a + x.amount, 0)
      out.push([num(s), num(s)])
      real += s
    }
  }
  out.push(['Total', num(plan), num(real), num(real - plan)])
  return out
}

const CONTRACTOR_LABEL: Record<string, string> = { MEQ: 'Bahan Baku Terpakai', FPC: 'Penyelesaian Proyek' }

/** Jurnal Proyek Dalam Proses: the project's lines on its WIP account, grouped per document (date, number order), subtotal each, grand total. */
export function projectContractorJournal(p: Project): string[][] {
  const ls = p.journal.filter(l => l.account === p.wip), out = [['Tanggal', 'Tipe Transaksi', 'Kode Perkiraan', 'Nama Akun Perkiraan', 'Debit', 'Kredit']]
  for (const n of [...new Set(ls.map(l => l.number))]) {
    const doc = ls.filter(l => l.number === n)
    out.push([n], ...doc.map(l => [fmtDate(l.date), CONTRACTOR_LABEL[l.sourceType] ?? typeLabel(l), l.account, l.accountName, num(l.debit), num(l.credit)]))
    out.push([num(doc.reduce((s, l) => s + l.debit, 0)), num(doc.reduce((s, l) => s + l.credit, 0))])
  }
  out.push([num(ls.reduce((s, l) => s + l.debit, 0)), num(ls.reduce((s, l) => s + l.credit, 0))])
  return out
}

const usagesIn = (ps: Project[], from: string, to: string) =>
  ps.flatMap(p => p.usages.filter(u => inRange(u.date, from, to)).map(u => ({ p, u }))).sort((a, b) => (a.u.date + a.u.number).localeCompare(b.u.date + b.u.number))

/** Daftar Bahan Baku Terpakai: one row per MEQ dated in range. */
export const materialEquipmentList = (ps: Project[], from: string, to: string) => [
  ['Tanggal', 'Nomor #', 'No. Proyek', 'Keterangan'], ...usagesIn(ps, from, to).map(({ p, u }) => row(fmtDate(u.date), u.number, p.no, u.description)),
]

/** Rincian Bahan Baku Terpakai: one block (page) per MEQ; lines under their RAB task heading. */
export function materialEquipmentDetail(ps: Project[], from: string, to: string): string[][] {
  return usagesIn(ps, from, to).flatMap(({ p, u }) => {
    const tasks = p.rab?.tasks ?? []
    return [
      ['Tanggal', ':', fmtDate(u.date), 'Nama Proyek', ':', p.name], row('Nomor #', ':', u.number, 'Keterangan', ':', u.description), ['No. Proyek', ':', p.no],
      ['Keterangan', 'Kuantitas', 'Satuan', 'Nama gudang'],
      ...[...new Set(u.lines.map(l => l.task))].flatMap(t => [[tasks.find(x => x.id === t)?.name ?? ''], ...u.lines.filter(l => l.task === t).map(l => row(l.name, qty(l.qty), l.unit, l.warehouse))]),
    ]
  })
}

/** Total Progress of a survey: its lines' portion weighted by task cost (inferred; every captured line is 100). */
function surveyTotal(p: Project, lines: { task: number; pct: number }[]) {
  const w = (id: number) => { const t = p.rab?.tasks.find(x => x.id === id); return t ? t.volume * t.unitCost : 0 }
  const tw = lines.reduce((s, l) => s + w(l.task), 0)
  return tw ? lines.reduce((s, l) => s + l.pct * w(l.task), 0) / tw : 0
}
const surveysIn = (ps: Project[], from: string, to: string) =>
  ps.flatMap(p => p.surveys.filter(s => inRange(s.date, from, to)).map(s => ({ p, s }))).sort((a, b) => (a.s.date + a.s.number).localeCompare(b.s.date + b.s.number))

/** Daftar Survei Proyek. */
export const surveyList = (ps: Project[], from: string, to: string) => [
  ['Tanggal', 'Nomor #', 'No. Proyek', 'Progres (Survei)', 'Keterangan', 'Surveyor'],
  ...surveysIn(ps, from, to).map(({ p, s }) => row(fmtDate(s.date), s.number, p.no, qty(surveyTotal(p, s.lines)), s.description, s.surveyor)),
]

/** Rincian Survei Proyek: one block (page) per survey; lines under their RAB group name (no Roman numeral). */
export function contractorSurveyDetail(ps: Project[], from: string, to: string): string[][] {
  return surveysIn(ps, from, to).flatMap(({ p, s }) => {
    const tasks = (p.rab?.tasks ?? []).filter(t => s.lines.some(l => l.task === t.id))
    return [
      ['Tanggal', ':', fmtDate(s.date), 'Nama Proyek', ':', p.name], row('Nomor #', ':', s.number, 'Nama Surveyor', ':', s.surveyor),
      ['No. Proyek', ':', p.no, 'Total Progress', ':', qty(surveyTotal(p, s.lines))],
      ['Keterangan', 'Volume', 'Progress(Kts)', 'Satuan', 'Progress (%)'],
      ...groups(tasks).flatMap(g => [[g.name], ...g.tasks.map(t => { const l = s.lines.find(x => x.task === t.id)!; return row(t.name, qty(t.volume), qty(l.qty), t.unit, qty(l.pct)) })]),
    ]
  })
}

const days = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 86_400_000

/** Progres Proyek as of a date. Rencana % = share of the task's schedule elapsed (inferred; captured only at 100);
 * Realisasi % = latest survey portion up to the date; groups weighted by task cost. Tertagih = an invoice billed the task's group. */
export function projectContractorProgress(p: Project, asOf: string): string[][] {
  const out = [['Uraian Pekerjaan', 'Rencana %', 'Realisasi %', 'Tagihan', 'Faktur Penjualan']]
  const plan = (t: Task) => !t.end || asOf >= t.end ? 100 : !t.start || asOf < t.start ? 0 : Math.min(100, (days(t.start, asOf) + 1) / (days(t.start, t.end) + 1) * 100)
  const real = (t: Task) => Math.min(100, p.surveys.filter(s => s.date <= asOf).flatMap(s => s.lines.filter(l => l.task === t.id)).reduce((m, l) => Math.max(m, l.pct), 0))
  for (const g of groups(p.rab?.tasks ?? [])) {
    const w = g.tasks.reduce((s, t) => s + t.volume * t.unitCost, 0), avg = (f: (t: Task) => number) => w ? g.tasks.reduce((s, t) => s + f(t) * t.volume * t.unitCost, 0) / w : 0
    out.push([`${g.no}. ${g.name}`, qty(avg(plan)), qty(avg(real))])
    const bill = p.billings.find(b => b.group === g.no && b.date <= asOf)
    for (const t of g.tasks) out.push(row(t.name, qty(plan(t)), qty(real(t)), bill ? 'Tertagih' : '', bill?.invoice ?? ''))
  }
  return out
}

/** Mutasi Bank per Proyek: the project's cash/bank lines, date order, running Saldo; totals of Masuk and Keluar. */
export function bankMutationByProjectContractor(p: Project): string[][] {
  let saldo = 0
  const ls = p.journal.filter(l => l.accountType === 'CASH_BANK')
  return [['Tanggal', 'Nomor Referensi', 'Bank', 'Keterangan', 'Masuk', 'Keluar', 'Saldo'],
    ...ls.map(l => { saldo += l.debit - l.credit; return row(fmtDate(l.date), l.number, l.accountName, l.description, num(l.debit), num(l.credit), num(saldo)) }),
    [num(ls.reduce((s, l) => s + l.debit, 0)), num(ls.reduce((s, l) => s + l.credit, 0))]]
}

/** Laba/Rugi Proyek Kontraktor: the standard statement over the selected projects' lines, one column each, then Total.
 * Accurate refuses an empty selection ("Proyek harus diisi", the only capture). */
export function profitLossByProjectContractor(accounts: TbAccount[], ps: Project[], selected: string[], from: string, to: string, o: StatementOptions) {
  if (!selected.length) throw new DomainError('Proyek harus diisi')
  const chosen = selected.map(no => byNo(ps, no))
  const lines: DimLine[] = chosen.flatMap(p => p.journal.map(l => ({ account: l.account, date: l.date, debit: l.debit, credit: l.credit, branch: null, department: null, project: p.name })))
  return profitLossByDim(accounts, lines, 'project', chosen.map(p => p.name), from, to, o, STANDARD)
}
