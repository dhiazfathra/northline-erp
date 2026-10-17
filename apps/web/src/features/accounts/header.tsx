import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { useShell, useT } from '@/lib/shell'

export const fmtIdr = (n: number, lang: string) => (n < 0 ? '-' : '') + Math.abs(n).toLocaleString(lang === 'id' ? 'id-ID' : 'en-US')

const list = { id: 'Daftar', en: 'List' }

/** Doc frame: module eyebrow + title + segmented sub-tabs (list / open record). */
export function AccountsFrame({ record, children }: { record?: string; children: ReactNode }) {
  const { isMobile } = useShell()
  const t = useT()
  const tab = (active: boolean) => `flex items-center gap-2 rounded-[16px] px-[14px] py-[8px] text-[12px] cursor-pointer ${active ? 'bg-[var(--ink)] text-[var(--paper)]' : ''}`
  return (
    <div className={`flex-none animate-[fade_.25s] pt-[20px] pb-[32px] ${isMobile ? 'px-[16px]' : 'px-[32px]'}`}>
      <div className="mb-[18px] flex flex-wrap items-end justify-between gap-[14px]">
        <div>
          <div className="text-[11px] uppercase tracking-[.5px] opacity-60">{t({ id: 'Buku Besar', en: 'General Ledger' })}</div>
          <div className={`mt-[4px] tracking-[-.3px] ${isMobile ? 'text-[22px]' : 'text-[28px]'}`}>{t({ id: 'Akun Perkiraan', en: 'Chart of Accounts' })}</div>
        </div>
        <div className="flex gap-[4px] rounded-[20px] bg-[rgba(var(--fg),.08)] p-[4px]">
          {record ? <Link to="/accounts" className={tab(false)}>{t(list)}</Link> : <span className={tab(true)}>{t(list)}</span>}
          {record && (
            <span className={tab(true)}>
              {record}
              <Link to="/accounts" className="text-[14px] leading-none opacity-60 hover:opacity-100">×</Link>
            </span>
          )}
        </div>
      </div>
      {children}
    </div>
  )
}
