import type { Feature } from '@northline/schemas/ledger'
import { useQuery } from '@tanstack/react-query'
import { Switch, Tabs } from 'radix-ui'
import { useEffect, useState } from 'react'
import { defaultAccountsQuery, featuresQuery, useSaveFeatures } from '@/api/ledger'
import { useShell, useT } from '@/lib/shell'
import { cn } from '@/lib/utils'
import { idr as fmt } from '@northline/schemas/fixtures'
import { Confirm, ConfirmAction, ConfirmCancel, Frame, btnInk, btnOutline } from './ui'

const tabs = [
  { id: 'fitur', n: { id: 'Fitur', en: 'Features' } },
  { id: 'akun', n: { id: 'Akun Bawaan', en: 'Default Accounts' } },
  { id: 'penjualan', n: { id: 'Penjualan', en: 'Sales' } },
  { id: 'pembelian', n: { id: 'Pembelian', en: 'Purchasing' } },
  { id: 'persediaan', n: { id: 'Persediaan', en: 'Inventory' } },
  { id: 'aset', n: { id: 'Aset Tetap', en: 'Fixed Assets' } },
  { id: 'pajak', n: { id: 'Pajak', en: 'Tax' } },
  { id: 'kurs', n: { id: 'Mata Uang', en: 'Currency' } },
  { id: 'lain', n: { id: 'Lainnya', en: 'Other' } },
]

export function Preferences() {
  const t = useT()
  const { showToast, setDirty } = useShell()
  const { data } = useQuery(featuresQuery)
  const accounts = useQuery(defaultAccountsQuery)
  const save = useSaveFeatures()
  const [draft, setDraft] = useState<Feature[] | null>(null)
  const [paid, setPaid] = useState<Feature | null>(null)
  const [off, setOff] = useState<Feature | null>(null)
  const [oneWay, setOneWay] = useState<Feature | null>(null)
  const list = draft ?? data ?? []
  const changed = !!draft && JSON.stringify(draft) !== JSON.stringify(data)
  const cost = list.reduce((s, f) => s + (f.on && f.price ? f.price : 0), 0)

  useEffect(() => setDirty('/settings/preferences', changed), [changed, setDirty])

  const set = (id: string, on: boolean) => setDraft(list.map((f) => (f.id === id ? { ...f, on } : f)))
  const toggle = (f: Feature) => {
    if (locked(f)) return
    if (!f.on && f.oneWay) return setOneWay(f)
    if (!f.on && f.price) return setPaid(f)
    if (f.on && f.hasData) return setOff(f)
    set(f.id, !f.on)
  }
  // one-way features stay on once enabled
  const locked = (f: Feature) => !!f.lockedNote || (!!f.oneWay && f.on && !!data?.find((x) => x.id === f.id)?.on)
  const lockNote = (f: Feature) => f.lockedNote ?? (locked(f) ? t({ id: 'Tidak dapat dinonaktifkan setelah aktif', en: 'Cannot be turned off once enabled' }) : '')
  const groups = [...new Set(list.map((f) => f.group))]

  return (
    <Frame>
      <Tabs.Root defaultValue="fitur" orientation="vertical" data-screen-label="Preferensi" className="glass-card flex flex-wrap items-start gap-[18px] p-[18px]">
        <Tabs.List className="flex flex-[0_0_200px] flex-col gap-0.5">
          {tabs.map((x) => (
            <Tabs.Trigger
              key={x.id}
              value={x.id}
              className="cursor-pointer rounded-xl px-3 py-2.5 text-left text-[13px] font-light hover:bg-[rgba(var(--fg),.08)] data-[state=active]:bg-[rgba(var(--fg),.12)] data-[state=active]:font-normal"
            >
              {t(x.n)}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-[18px]">
          <Tabs.Content value="fitur" className="flex flex-col gap-[18px] outline-none">
            {groups.map((g) => (
              <div key={g} className="flex flex-col gap-1">
                <div className="border-b border-[rgba(var(--fg),.12)] pb-2 text-[15px]">{g}</div>
                {list
                  .filter((f) => f.group === g)
                  .map((f) => (
                    <div key={f.id} className={cn('flex items-center gap-3 py-[9px]', locked(f) && 'opacity-55')}>
                      <Switch.Root
                        checked={f.on}
                        onCheckedChange={() => toggle(f)}
                        disabled={locked(f)}
                        aria-label={f.name}
                        className="relative h-[22px] w-[38px] flex-none cursor-pointer rounded-[11px] border border-[rgba(var(--fg),.3)] bg-[rgba(var(--fg),.1)] p-0 disabled:cursor-not-allowed data-[state=checked]:bg-(--ink)"
                      >
                        <Switch.Thumb className="absolute top-0.5 left-0.5 block size-4 rounded-full bg-(--paper) transition-[left] duration-150 data-[state=checked]:left-[18px]" />
                      </Switch.Root>
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="text-[13px]">
                          {f.name}{' '}
                          <span className="text-[11px] opacity-75">
                            ·{' '}
                            {f.price && !f.on
                              ? t({ id: `Berbayar · Rp ${fmt(f.price)}/bulan`, en: `Paid · Rp ${fmt(f.price)}/month` })
                              : f.on
                                ? t({ id: 'Aktif', en: 'On' })
                                : t({ id: 'Nonaktif', en: 'Off' })}
                          </span>
                        </span>
                        {locked(f) && (
                          <span className="flex items-center gap-1 text-[11.5px] opacity-80">
                            <i className="ph-light ph-lock-simple" />
                            {lockNote(f)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            ))}
            <div className="text-[12.5px]">
              {t({ id: 'Biaya tambahan', en: 'Extra cost' })}:{' '}
              <span className="opacity-85">{cost ? t({ id: `Rp ${fmt(cost)}/bulan`, en: `Rp ${fmt(cost)}/month` }) : t({ id: 'Gratis', en: 'Free' })}</span>
            </div>
          </Tabs.Content>
          <Tabs.Content value="akun" className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3.5 outline-none">
            {accounts.data?.map((a) => (
              <div key={a.label} className="flex flex-col gap-1.5 text-[11px]">
                <span className="opacity-80">{a.label}</span>
                <span className={cn('field flex items-center gap-2 px-3.5 py-[11px]', !a.value && 'opacity-55')}>
                  <i className="ph-light ph-magnifying-glass opacity-70" />
                  {a.value || t({ id: 'Pilih akun', en: 'Choose account' })}
                </span>
              </div>
            ))}
          </Tabs.Content>
          {tabs.slice(2).map((x) => (
            <Tabs.Content key={x.id} value={x.id} className="rounded-2xl border border-dashed border-[rgba(var(--fg),.25)] p-7 text-center text-[13px] opacity-80 outline-none">
              {t({ id: `Pengaturan ${x.n.id} belum tersedia di versi ini.`, en: `${x.n.en} settings are not available in this version yet.` })}
            </Tabs.Content>
          ))}
          <div className="flex justify-end">
            <button
              type="button"
              disabled={!changed || save.isPending}
              onClick={() =>
                save.mutate(list, {
                  onSuccess: () => {
                    setDraft(null)
                    showToast(t({ id: 'Preferensi tersimpan', en: 'Preferences saved' }))
                  },
                })
              }
              className={cn(btnInk, 'rounded-[20px] px-5 py-2.5 text-[13px]', !changed && 'opacity-40')}
            >
              {t({ id: 'Simpan', en: 'Save' })}
            </button>
          </div>
        </div>
      </Tabs.Root>

      <Confirm
        open={!!paid}
        onOpenChange={(o) => !o && setPaid(null)}
        icon={<i className="ph-light ph-lock-key text-[20px] text-[#f59e0b]" />}
        title={paid?.name ?? ''}
        actions={
          <>
            <ConfirmCancel className={btnOutline}>{t({ id: 'Batal', en: 'Cancel' })}</ConfirmCancel>
            <ConfirmAction className={btnInk} onClick={() => paid && set(paid.id, true)}>
              {t({ id: 'Aktifkan', en: 'Activate' })}
            </ConfirmAction>
          </>
        }
      >
        {paid &&
          t({
            id: `Mengaktifkan ${paid.name} menambah biaya langganan Rp ${fmt(paid.price ?? 0)} per bulan mulai periode tagihan berikutnya.`,
            en: `Turning on ${paid.name} adds Rp ${fmt(paid.price ?? 0)} per month from the next billing period.`,
          })}
      </Confirm>
      <Confirm
        open={!!oneWay}
        onOpenChange={(o) => !o && setOneWay(null)}
        icon={<i className="ph-light ph-warning text-[20px] text-[#f59e0b]" />}
        title={t({ id: 'Perhatian', en: 'Warning' })}
        actions={
          <>
            <ConfirmCancel className={btnOutline}>{t({ id: 'Batal', en: 'Cancel' })}</ConfirmCancel>
            <ConfirmAction className={btnInk} onClick={() => oneWay && set(oneWay.id, true)}>
              {t({ id: 'Ya, aktifkan', en: 'Yes, enable' })}
            </ConfirmAction>
          </>
        }
      >
        {oneWay &&
          t({
            id: `Fitur ${oneWay.name} tidak dapat dinonaktifkan kembali setelah disimpan. Lanjutkan?`,
            en: `${oneWay.name} cannot be turned off again once saved. Continue?`,
          })}
      </Confirm>
      <Confirm
        open={!!off}
        onOpenChange={(o) => !o && setOff(null)}
        icon={<i className="ph-light ph-trash text-[20px] text-[#ef4444]" />}
        title={t({ id: 'Konfirmasi', en: 'Confirm' })}
        actions={
          <>
            <ConfirmCancel className={btnOutline}>{t({ id: 'Tidak', en: 'No' })}</ConfirmCancel>
            <ConfirmAction className={cn(btnInk, 'bg-[#dc2626] text-white')} onClick={() => off && set(off.id, false)}>
              {t({ id: 'Ya, hapus', en: 'Yes, delete' })}
            </ConfirmAction>
          </>
        }
      >
        {off &&
          t({
            id: `Menonaktifkan ${off.name} akan menghapus pengaturan terkait. Data transaksi tetap tersimpan. Lanjutkan?`,
            en: `Turning off ${off.name} deletes its related settings. Transactions are kept. Continue?`,
          })}
      </Confirm>
    </Frame>
  )
}
