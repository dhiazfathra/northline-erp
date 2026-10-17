import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { accountTypes } from '@northline/schemas/accounts'
import { toTree, useAccounts } from '@/api/accounts'
import { Dropdown } from '@/components/dropdown'
import { Skeleton } from '@/components/ui/skeleton'
import { useShell, useT } from '@/lib/shell'
import { AccountsFrame, fmtIdr } from './header'

const grid = 'grid grid-cols-[1fr_2.4fr_1.2fr_1.1fr] gap-[12px] px-[22px]'

export function AccountsList() {
  const { L, refreshing } = useShell()
  const t = useT()
  const nav = useNavigate()
  const { data, isPending } = useAccounts()
  const [q, setQ] = useState('')
  const [draft, setDraft] = useState('')
  const [type, setType] = useState('')
  const typeLbl = t({ id: 'Tipe', en: 'Type' })
  const rows = toTree(data ?? []).filter(
    (r) => (!type || r.type === type) && (!q || `${r.code} ${r.name}`.toLowerCase().includes(q.toLowerCase())),
  )
  return (
    <AccountsFrame>
      <div className="mb-[14px] flex flex-wrap items-center gap-[8px]">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && setQ(draft)} placeholder={t({ id: 'Ketik dan [Enter]', en: 'Type and [Enter]' })}
          className="min-w-0 max-w-[320px] flex-[1_1_220px] rounded-[18px] border border-[rgba(var(--fg),.18)] bg-[rgba(var(--fg),.06)] px-[14px] py-[9px] text-[12px] text-[var(--ink)] outline-none" />
        <div className="w-[170px] flex-none">
          <Dropdown value={type} options={[...accountTypes]} onSelect={setType} placeholder={`${typeLbl}: ${t({ id: 'Semua', en: 'All' })}`}
            className="h-[36px] rounded-[18px] px-[12px] text-[12px]" />
        </div>
        <span className="text-[11px] opacity-55">{data ? `${rows.length} ${t({ id: 'akun', en: 'accounts' })}` : ''}</span>
        <button type="button" onClick={() => nav({ to: '/accounts/new' })}
          className="ml-auto flex-none cursor-pointer rounded-[18px] bg-[var(--ink)] px-[16px] py-[9px] text-[12px] font-normal text-[var(--paper)]">+ {L.newEntry}</button>
      </div>
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto"><div className="min-w-[640px]">
          <div className={`${grid} border-b border-[rgba(var(--fg),.12)] py-[13px] text-[11px] opacity-55`}>
            <span>{t({ id: 'Kode', en: 'Code' })}</span><span>{t({ id: 'Nama', en: 'Name' })}</span><span>{typeLbl}</span>
            <span className="text-right">{t({ id: 'Saldo', en: 'Balance' })}</span>
          </div>
          {isPending && Array.from({ length: 6 }, (_, i) => (
            <div key={i} className={`${grid} border-b border-[rgba(var(--fg),.07)] py-[14px]`}>{[0, 1, 2, 3].map((j) => <Skeleton key={j} className="h-[14px]" />)}</div>
          ))}
          {rows.map((r) => {
            const pad = { paddingLeft: r.depth * 18 }
            const wt = r.depth ? 'font-normal' : 'font-medium'
            return (
              <div key={r.id} data-rf-row="1" onClick={() => nav({ to: '/accounts/$accountId', params: { accountId: r.id } })}
                className={`${grid} cursor-pointer items-center border-b border-[rgba(var(--fg),.07)] py-[11px] text-[13px] transition-opacity duration-[.25s] hover:bg-[rgba(var(--fg),.08)] ${refreshing ? 'opacity-35' : ''}`}>
                <span style={pad} className={`tabular-nums ${wt}`}>{r.code}</span>
                <span style={pad} className={`truncate ${wt}`}>{r.name}</span>
                <span className="opacity-75">{r.type}</span>
                <span className={`text-right tabular-nums ${r.balance < 0 ? 'text-[#ef4444]' : ''}`}>{r.contra && r.balance ? '-' : ''}{fmtIdr(r.balance)}</span>
              </div>
            )
          })}
          {data && !rows.length && <div className="p-[28px] text-center text-[12.5px] opacity-55">{t({ id: 'Tidak ada akun yang cocok', en: 'No matching accounts' })}</div>}
        </div></div>
      </div>
    </AccountsFrame>
  )
}
