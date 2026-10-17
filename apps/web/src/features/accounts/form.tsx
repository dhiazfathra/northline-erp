import { zodResolver } from '@hookform/resolvers/zod'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { useEffect, useState, type ReactNode } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { accountInputSchema, accountTypes, type Account, type AccountInput } from '@northline/schemas/accounts'
import { accountUsers, bankOptions, toTree, useAccounts, useDeleteAccount, useSaveAccount } from '@/api/accounts'
import { Dropdown } from '@/components/dropdown'
import { Skeleton } from '@/components/ui/skeleton'
import { useShell, useT } from '@/lib/shell'
import { AccountsFrame, fmtIdr } from './header'

type Sec = 'gen' | 'kids' | 'saldo' | 'users'
const T = {
  gen: { id: 'Umum', en: 'General' }, kids: { id: 'Sub Akun', en: 'Sub-accounts' }, saldo: { id: 'Saldo Awal', en: 'Opening Balance' }, users: { id: 'Akses Pengguna', en: 'User Access' },
  accInfo: { id: 'Informasi Akun', en: 'Account Info' }, type: { id: 'Tipe Akun', en: 'Account Type' }, subAcc: { id: 'Sub akun dari', en: 'Sub-account of' },
  parent: { id: 'Akun Induk', en: 'Parent Account' }, code: { id: 'Kode Perkiraan', en: 'Account Code' }, name: { id: 'Nama', en: 'Name' },
  hint: { id: 'Nama akan tampil di laporan keuangan', en: 'Shown on financial statements' }, cur: { id: 'Mata Uang', en: 'Currency' }, note: { id: 'Catatan', en: 'Notes' },
  voucher: { id: 'Nama di Voucher', en: 'Voucher Name' }, nowBal: { id: 'Saldo Saat Ini', en: 'Current Balance' }, bal: { id: 'Saldo', en: 'Balance' },
  nowNote: { id: 'Saldo dihitung dari seluruh transaksi yang telah diposting per 17/10/2026.', en: 'Balance is computed from all posted transactions as of 17/10/2026.' },
  bankInfo: { id: 'Informasi Bank', en: 'Bank Info' }, bank: { id: 'Bank', en: 'Bank' }, accNo: { id: 'No. Rekening', en: 'Account No.' }, accName: { id: 'Atas Nama', en: 'Account Holder' },
  openT: { id: 'Saldo Awal', en: 'Opening Balance' }, amt: { id: 'Jumlah', en: 'Amount' }, asOf: { id: 'Per Tanggal', en: 'As of' },
  access: { id: 'Akses Pengguna', en: 'User Access' }, allU: { id: 'Semua pengguna dapat menggunakan akun ini', en: 'All users can use this account' },
  del: { id: 'Hapus', en: 'Delete' }, saved: { id: 'Akun disimpan', en: 'Account saved' }, deleted: { id: 'Akun dihapus', en: 'Account deleted' },
  newRec: { id: 'Akun Baru', en: 'New Account' }, notFound: { id: 'Akun tidak ditemukan', en: 'Account not found' },
}
const sec = 'flex min-w-0 flex-col gap-[14px]'
const h = 'border-b border-[rgba(var(--fg),.12)] pb-[10px] text-[16px]'
const inp = 'field w-full px-[14px] py-[11px] text-[13px] text-[var(--ink)] outline-none'
const ro = `${inp} bg-[rgba(var(--fg),.03)] opacity-75`
const bad = '!border-[#f472b6]'

function Field({ label, req, children }: { label: string; req?: boolean; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-[6px] text-[11px]">
      <span className="opacity-75">{label} {req && <span className="text-[#ec4899]">*</span>}</span>
      {children}
    </label>
  )
}

function Check({ on, onClick, children, className = '' }: { on: boolean; onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button type="button" role="checkbox" aria-checked={on} onClick={onClick} className={`flex w-max cursor-pointer items-center gap-[8px] text-[12.5px] ${className}`}>
      <span className={`flex size-[16px] items-center justify-center rounded-[5px] border border-[rgba(var(--fg),.4)] text-[11px] ${on ? 'bg-[var(--ink)] text-[var(--paper)]' : ''}`}>
        {on && <i className="ph-light ph-check" />}
      </span>
      {children}
    </button>
  )
}

const empty: AccountInput = { type: '', isSub: false, parentId: '', code: '', name: '', note: '', bank: '', accNo: '', accName: '', opening: 0, openDate: '2026-10-17', allUsers: true, users: [] }
const toInput = (a: Account): AccountInput => ({ ...a, isSub: !!a.parentId, parentId: a.parentId ?? '' })

export function AccountForm({ id }: { id?: string }) {
  const t = useT()
  const { data, isPending } = useAccounts()
  const acc = id ? data?.find((x) => x.id === id) : undefined
  return (
    <AccountsFrame record={id ? acc?.name ?? '…' : t(T.newRec)}>
      {id && isPending ? <Skeleton className="h-[420px] rounded-[24px]" /> : id && !acc ? (
        <div className="glass-card p-[28px] text-center text-[12.5px] opacity-55">{t(T.notFound)}</div>
      ) : (
        <Inner key={id ?? 'new'} acc={acc} all={data ?? []} />
      )}
    </AccountsFrame>
  )
}

function Inner({ acc, all }: { acc?: Account; all: Account[] }) {
  const { L, lang, isMobile, setDirty, showToast, mode } = useShell()
  const t = useT()
  const nav = useNavigate()
  const path = useLocation().pathname
  const save = useSaveAccount()
  const del = useDeleteAccount()
  const isNew = !acc
  const [cur, setCur] = useState<Sec>('gen')
  const { register, control, handleSubmit, setValue, formState } = useForm<AccountInput>({
    resolver: zodResolver(accountInputSchema),
    defaultValues: acc ? toInput(acc) : empty,
  })
  const { errors, isDirty } = formState
  useEffect(() => setDirty(path, isDirty), [path, isDirty, setDirty])
  useEffect(() => () => setDirty(path, false), [path, setDirty])

  const v = useWatch({ control }) as AccountInput
  const isBank = v.type === 'Kas & Bank'
  const parents = all.filter((x) => x.id !== acc?.id)
  const label = (x: Account) => `${x.code} ${x.name}`
  const kids = acc ? toTree(all).filter((x) => x.parentId === acc.id) : []
  const secs: Sec[] = isNew ? ['gen', 'saldo', 'users'] : ['gen', 'kids', 'users']

  const close = () => nav({ to: '/accounts' })
  const onSave = handleSubmit(
    async (input) => {
      await save.mutateAsync({ id: acc?.id, input })
      setDirty(path, false)
      showToast(t(T.saved))
      close()
    },
    () => setCur('gen'),
  )

  return (
    <form onSubmit={onSave}>
      <div className="mb-[12px] flex flex-wrap gap-[6px]">
        {secs.map((s) => (
          <button key={s} type="button" onClick={() => setCur(s)}
            className={`cursor-pointer rounded-[16px] border border-[rgba(var(--fg),.16)] px-[14px] py-[8px] text-[12px] ${cur === s ? 'bg-[var(--ink)] text-[var(--paper)]' : ''}`}>{t(T[s])}</button>
        ))}
      </div>
      <div className={`glass-card ${isMobile ? 'p-[18px]' : 'p-[28px]'}`}>
        {cur === 'gen' && (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-[28px] max-[400px]:grid-cols-1">
            <div className={sec}>
              <div className={h}>{t(T.accInfo)}</div>
              <Field label={t(T.type)}>
                {isNew ? (
                  <Controller control={control} name="type" render={({ field }) => (
                    <Dropdown value={field.value} options={[...accountTypes]} onSelect={field.onChange} invalid={!!errors.type} />
                  )} />
                ) : <input value={v.type} readOnly className={ro} />}
              </Field>
              <Check on={v.isSub} onClick={() => setValue('isSub', !v.isSub, { shouldDirty: true })}>{t(T.subAcc)}</Check>
              {v.isSub && (
                <Field label={t(T.parent)} req>
                  <Controller control={control} name="parentId" render={({ field }) => (
                    <Dropdown value={(() => { const p = parents.find((x) => x.id === field.value); return p ? label(p) : '' })()}
                      options={parents.map(label)} onSelect={(o) => field.onChange(parents.find((x) => label(x) === o)?.id ?? '')}
                      placeholder={lang === 'id' ? 'Pilih…' : 'Select…'} invalid={!!errors.parentId} />
                  )} />
                </Field>
              )}
              <Field label={t(T.code)} req><input {...register('code')} className={`${inp} tabular-nums ${errors.code ? bad : ''}`} /></Field>
              <Field label={t(T.name)} req>
                <input {...register('name')} className={`${inp} ${errors.name ? bad : ''}`} />
                <span className="italic opacity-50">{t(T.hint)}</span>
              </Field>
              <Field label={t(T.cur)}><input value="IDR — Rupiah" readOnly className={ro} /></Field>
              <Field label={t(T.note)}><textarea {...register('note')} rows={3} className={`${inp} resize-y`} /></Field>
              {acc && (
                <>
                  {isBank && <Field label={t(T.voucher)}><input value={v.name} readOnly className={`${inp} !border-[rgba(34,197,94,.5)] !bg-[rgba(34,197,94,.1)]`} /></Field>}
                  <div className="border-b border-[rgba(var(--fg),.12)] py-[10px] text-[16px]">{t(T.nowBal)}</div>
                  <div className="flex flex-col gap-[10px] rounded-[18px] bg-[rgba(var(--fg),.06)] px-[18px] py-[16px]">
                    <div className="flex items-center justify-between gap-[12px]">
                      <span className="flex items-center gap-[8px] text-[12px] opacity-70"><i className="ph-light ph-wallet text-[16px]" />{t(T.bal)}</span>
                      <span className={`text-[24px] font-extralight tabular-nums ${acc.balance < 0 ? 'text-[#ef4444]' : ''}`}>Rp {fmtIdr(acc.balance, lang)}</span>
                    </div>
                    <div className="flex gap-[8px] border-t border-[rgba(var(--fg),.1)] pt-[10px] text-[11px] opacity-60">
                      <i className="ph-light ph-info text-[14px]" /><span className="text-pretty">{t(T.nowNote)}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
            {isBank && (
              <div className={sec}>
                <div className={h}>{t(T.bankInfo)}</div>
                <Field label={t(T.bank)}>
                  <Controller control={control} name="bank" render={({ field }) => <Dropdown value={field.value} options={bankOptions} onSelect={field.onChange} />} />
                </Field>
                <Field label={t(T.accNo)}><input {...register('accNo')} className={inp} /></Field>
                <Field label={t(T.accName)}><input {...register('accName')} className={inp} /></Field>
              </div>
            )}
          </div>
        )}
        {cur === 'saldo' && (
          <div className="flex max-w-[420px] flex-col gap-[14px]">
            <div className={h}>{t(T.openT)}</div>
            <Field label={t(T.amt)}>
              <span className="field flex items-center overflow-hidden">
                <span className="px-[12px] text-[12px] opacity-55">Rp</span>
                <input inputMode="numeric" value={v.opening ? fmtIdr(v.opening, lang) : ''}
                  onChange={(e) => setValue('opening', Number(e.target.value.replace(/\D/g, '')) || 0, { shouldDirty: true })}
                  className="min-w-0 flex-1 border-none bg-transparent py-[11px] pr-[14px] text-right text-[13px] tabular-nums text-[var(--ink)] outline-none" />
              </span>
            </Field>
            <Field label={t(T.asOf)}><input type="date" {...register('openDate')} className={`${inp} py-[10px]`} style={{ colorScheme: mode }} /></Field>
          </div>
        )}
        {cur === 'users' && (
          <div className="flex max-w-[520px] flex-col gap-[14px]">
            <div className={h}>{t(T.access)}</div>
            <Check on={v.allUsers} onClick={() => setValue('allUsers', !v.allUsers, { shouldDirty: true })}>{t(T.allU)}</Check>
            {!v.allUsers && (
              <div className="flex flex-col gap-[2px] pl-[24px]">
                {accountUsers.map((u) => (
                  <Check key={u} on={v.users.includes(u)} className="w-full rounded-[10px] p-[8px] hover:bg-[rgba(var(--fg),.08)]"
                    onClick={() => setValue('users', v.users.includes(u) ? v.users.filter((x) => x !== u) : [...v.users, u], { shouldDirty: true })}>{u}</Check>
                ))}
              </div>
            )}
          </div>
        )}
        {cur === 'kids' && acc && (
          <div className="flex flex-col gap-[4px]">
            <div className="grid grid-cols-[2fr_1fr] gap-[12px] rounded-[12px] bg-[rgba(var(--fg),.1)] px-[14px] py-[12px] text-[13px]"><span>{v.name}</span><span className="tabular-nums">{v.code}</span></div>
            {kids.map((k) => (
              <div key={k.id} onClick={() => nav({ to: '/accounts/$accountId', params: { accountId: k.id } })}
                className="grid cursor-pointer grid-cols-[2fr_1fr] gap-[12px] rounded-[12px] bg-[rgba(var(--fg),.05)] px-[14px] py-[12px] text-[13px] hover:bg-[rgba(var(--fg),.1)]">
                <span className="pl-[18px]">{k.name}</span><span className="tabular-nums">{k.code}</span>
              </div>
            ))}
          </div>
        )}
        <div className="mt-[18px] flex flex-wrap gap-[8px] border-t border-[rgba(var(--fg),.1)] pt-[18px]">
          <button type="submit" disabled={save.isPending}
            className={`cursor-pointer rounded-[20px] bg-[var(--ink)] px-[22px] py-[12px] text-center text-[13px] font-normal text-[var(--paper)] disabled:opacity-60 ${isMobile ? 'flex-1' : ''}`}>{L.save}</button>
          <button type="button" onClick={close} className="cursor-pointer rounded-[20px] bg-[rgba(var(--fg),.1)] px-[18px] py-[12px] text-[13px]">{L.cancel}</button>
          {acc && (
            <button type="button" onClick={async () => { await del.mutateAsync(acc.id); setDirty(path, false); showToast(t(T.deleted)); close() }}
              className="ml-auto cursor-pointer rounded-[20px] bg-[rgba(239,68,68,.14)] px-[18px] py-[12px] text-[13px] text-[#ef4444]">{t(T.del)}</button>
          )}
        </div>
      </div>
    </form>
  )
}
