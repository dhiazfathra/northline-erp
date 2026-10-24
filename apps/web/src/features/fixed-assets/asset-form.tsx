import { zodResolver } from '@hookform/resolvers/zod'
import { fixedAssetFormSchema, type AssetExpense, type AssetFile, type FixedAsset, type FixedAssetForm } from '@northline/schemas/fixed-assets'
import { accounts as fixtureAccounts } from '@northline/schemas/fixtures'
import { useQuery } from '@tanstack/react-query'
import { assetExpendituresQuery, branchesQuery } from '@/api/asset-modules'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useLeafAccounts } from '@/api/accounts'
import { assetJournals, assetTotal, categories, codeTypes, departments, fixedAssetQuery, methods, useDeleteFixedAsset, useSaveFixedAsset } from '@/api/fixed-assets'
import { Dropdown } from '@/components/dropdown'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { useShell, useT } from '@/lib/shell'
import { cn } from '@/lib/utils'
import { Check, DatePicker, DocHeader, Picker, menuPanel, fmtDate, fmtIdr, parseNum, tx } from './parts'

// The API has no file storage yet: attachments are hidden rather than pretending to save them.
const filesStored = false

const faT = {
  newTitle: { id: 'Aset Tetap Baru', en: 'New Fixed Asset' },
  name: { id: 'Nama Aset', en: 'Asset Name' },
  namePh: { id: 'Contoh: Toyota Innova B 1234 XYZ', en: 'e.g. Toyota Innova B 1234 XYZ' },
  code: { id: 'Kode Aset', en: 'Asset Code' },
  auto: { id: 'Penomoran otomatis', en: 'Auto numbering' },
  buy: { id: 'Tgl Beli', en: 'Purchase Date' },
  use: { id: 'Tgl Pakai', en: 'In-use Date' },
  att: { id: 'Lampiran', en: 'Attachments' },
  drop: { id: 'Tarik file ke sini atau', en: 'Drop files here or' },
  pick: { id: 'pilih file', en: 'browse' },
  attHint: { id: 'PDF, JPG, PNG · maks. 10 MB', en: 'PDF, JPG, PNG · max 10 MB' },
  attNone: { id: 'Belum ada lampiran', en: 'No attachments yet' },
  proc: { id: 'Proses', en: 'Process' },
  edit: { id: 'Ubah', en: 'Edit' },
  dup: { id: 'Duplikat', en: 'Duplicate' },
  del: { id: 'Hapus', en: 'Delete' },
  gen: { id: 'Umum', en: 'General' },
  exp: { id: 'Pengeluaran', en: 'Expenses' },
  oth: { id: 'Lain-lain', en: 'Other' },
  his: { id: 'Riwayat', en: 'History' },
  hisNone: { id: 'Belum ada jurnal untuk aset ini', en: 'No journals for this asset yet' },
  disposed: { id: 'Dilepas', en: 'Disposed' },
  intan: { id: 'Aset Tak Berwujud', en: 'Intangible Asset' },
  yes: { id: 'Ya', en: 'Yes' },
  method: { id: 'Metode Penyusutan', en: 'Depreciation Method' },
  cat: { id: 'Kategori Aset', en: 'Asset Category' },
  catPh: { id: 'Cari kategori…', en: 'Search category…' },
  accAsset: { id: 'Akun Aset', en: 'Asset Account' },
  accAccum: { id: 'Akun Akumulasi Penyusutan', en: 'Accumulated Depreciation Account' },
  accExp: { id: 'Akun Beban Penyusutan', en: 'Depreciation Expense Account' },
  accPh: { id: 'Cari akun…', en: 'Search account…' },
  qty: { id: 'Kuantitas', en: 'Quantity' },
  life: { id: 'Umur Aset', en: 'Useful Life' },
  yrs: { id: 'Tahun', en: 'Years' },
  mos: { id: 'Bulan', en: 'Months' },
  ratio: { id: 'Rasio Penyusutan / Tahun', en: 'Depreciation Rate / Year' },
  salv: { id: 'Nilai Sisa', en: 'Salvage Value' },
  expPick: { id: 'Tambah Pengeluaran Aset', en: 'Add Asset Expenditure' },
  expPh: { id: 'Cari pengeluaran aset…', en: 'Search asset expenditure…' },
  cCode: { id: 'No. Pengeluaran', en: 'Expenditure No.' },
  cDesc: { id: 'Keterangan', en: 'Description' },
  cDate: { id: 'Tanggal', en: 'Date' },
  cAmt: { id: 'Nilai', en: 'Amount' },
  none: { id: 'Belum ada pengeluaran. Tambahkan minimal satu.', en: 'No expenses yet. Add at least one.' },
  loc: { id: 'Lokasi', en: 'Location' },
  locPh: { id: 'Cari lokasi…', en: 'Search location…' },
  dept: { id: 'Departemen', en: 'Department' },
  deptPh: { id: 'Cari departemen…', en: 'Search department…' },
  branch: { id: 'Cabang', en: 'Branch' },
  hq: { id: 'Kantor Pusat', en: 'Head Office' },
  note: { id: 'Catatan', en: 'Notes' },
  lastDep: { id: 'Penyusutan Terakhir', en: 'Last Depreciation' },
  tax: { id: 'Aset Fiskal (Pajak)', en: 'Fiscal Asset (Tax)' },
  close: { id: 'Tutup', en: 'Close' },
  total: { id: 'Total Pengeluaran', en: 'Total Expenses' },
  book: { id: 'Nilai Buku', en: 'Book Value' },
  saved: { id: 'Aset tetap tersimpan', en: 'Fixed asset saved' },
  deleted: { id: 'Aset tetap dihapus', en: 'Fixed asset deleted' },
  delQ: { id: 'Hapus aset ini?', en: 'Delete this asset?' },
  delD: { id: 'Data dan riwayat penyusutan aset akan dihapus permanen.', en: 'The asset and its depreciation history will be permanently removed.' },
  invalid: { id: 'Lengkapi isian yang wajib', en: 'Fill in the required fields' },
  notFound: { id: 'Aset tidak ditemukan', en: 'Asset not found' },
}
const procs = [
  { id: 'Penyusutan Manual', en: 'Manual Depreciation' },
  { id: 'Pelepasan Aset', en: 'Asset Disposal' },
  { id: 'Revaluasi Aset', en: 'Asset Revaluation' },
  { id: 'Pindah Lokasi', en: 'Transfer Location' },
]

const empty: FixedAssetForm = {
  name: '', autoCode: true, codeType: codeTypes[0]!, code: '', buy: '2026-10-17', use: '2026-10-17', intangible: false, method: methods[0]!, category: '', assetAccount: '', accumAccount: '', expenseAccount: '',
  qty: 1, years: 0, months: 0, salvage: 0, expenses: [], location: '', department: '', note: '', tax: true, files: [],
}
/** Set by Duplicate, consumed by the next new form. */
let draft: FixedAssetForm | null = null

const roIn = 'w-full rounded-[14px] border border-[rgba(var(--fg),.18)] bg-[rgba(var(--fg),.03)] px-[14px] py-[11px] text-[13px] text-(--ink) outline-none'
const bad = 'border-[#f472b6]'
const popItem = 'flex cursor-pointer items-center gap-2 rounded-[10px] px-2.5 py-[9px] text-[12.5px] text-(--ink) focus:bg-[rgba(var(--fg),.1)] focus:text-(--ink)'
const popBox = cn(menuPanel, 'rounded-[20px] p-2 text-(--ink)')

function Field({ label, req, children, className }: { label: string; req?: boolean; children: ReactNode; className?: string }) {
  return (
    <label className={cn('flex flex-col gap-1.5 text-[11px]', className)}>
      <span className="opacity-75">
        {label}
        {req && <span className="text-[#ec4899]"> *</span>}
      </span>
      {children}
    </label>
  )
}

export function AssetForm({ id }: { id?: string }) {
  const { data, isPending, error } = useQuery({ ...fixedAssetQuery(id ?? ''), enabled: !!id })
  const t = useT()
  if (id && isPending)
    return (
      <DocHeader label={t(tx.title)} current="…">
        <Skeleton className="glass-card h-[520px]" />
      </DocHeader>
    )
  if (id && !data)
    return (
      <DocHeader label={t(tx.title)}>
        <div className="glass-card p-10 text-center text-[13px] opacity-60">{error ? error.message : t(faT.notFound)}</div>
      </DocHeader>
    )
  return <AssetFormBody key={id ?? 'new'} asset={data ?? undefined} />
}

function AssetFormBody({ asset }: { asset?: FixedAsset }) {
  const t = useT()
  const { data: locations = [] } = useQuery(branchesQuery)
  // Posted asset expenditures (Pengeluaran Aset) are what an asset capitalises.
  const { data: expenditures = [] } = useQuery({
    ...assetExpendituresQuery,
    select: (xs) => xs.map((x): AssetExpense => ({ code: x.number, desc: x.description, date: x.date.split('/').reverse().join('-'), amount: x.total })),
  })
  const { L, isMobile, showToast, setDirty, removeTab } = useShell()
  const { pathname } = useLocation()
  const nav = useNavigate()
  const save = useSaveFixedAsset()
  const del = useDeleteFixedAsset()
  const [editing, setEditing] = useState(!asset)
  const [sec, setSec] = useState<'gen' | 'exp' | 'oth' | 'his'>('gen')
  const [attOpen, setAttOpen] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [initial] = useState<FixedAssetForm>(() => {
    if (asset) return asset
    const d = draft ?? empty
    draft = null
    return d
  })

  const { register, control, handleSubmit, reset, setValue, getValues, formState } = useForm<FixedAssetForm>({ resolver: zodResolver(fixedAssetFormSchema), defaultValues: initial })
  const v = useWatch({ control }) as FixedAssetForm
  const e = formState.errors
  const ro = !editing

  useEffect(() => {
    setDirty(pathname, editing && formState.isDirty)
  }, [pathname, editing, formState.isDirty, setDirty])
  useEffect(() => () => setDirty(pathname, false), [pathname, setDirty])

  const total = assetTotal(v)
  const lifeMonths = v.years * 12 + v.months
  const ratio = v.method === methods[2] || !lifeMonths ? 0 : (1200 / lifeMonths) * (v.method === methods[1] ? 2 : 1)
  // straight-line accumulated depreciation up to the last posted run
  const ran = asset?.lastDep && lifeMonths ? Math.max(0, (new Date(asset.lastDep).getFullYear() - new Date(v.use).getFullYear()) * 12 + new Date(asset.lastDep).getMonth() - new Date(v.use).getMonth() + 1) : 0
  const book = asset?.status === 'disposed' ? 0 : Math.max(v.salvage, total - (v.method === methods[2] ? 0 : ((total - v.salvage) * Math.min(ran, lifeMonths)) / (lifeMonths || 1)))

  const onSave = handleSubmit(
    async (data) => {
      const saved = await save.mutateAsync({ id: asset?.id, data })
      showToast(t(faT.saved))
      setDirty(pathname, false)
      if (asset) {
        reset(saved)
        setEditing(false)
      } else {
        removeTab(pathname)
        nav({ to: '/fixed-assets/$assetId', params: { assetId: saved.id } })
      }
    },
    () => showToast(t(faT.invalid)),
  )
  const close = () => {
    removeTab(pathname)
    nav({ to: '/fixed-assets' })
  }
  const cancel = () => {
    if (!asset) return close()
    reset(asset)
    setEditing(false)
  }
  const addFiles = (list: FileList | null) => {
    if (!list?.length) return
    const files: AssetFile[] = [...getValues('files'), ...[...list].map((f) => ({ name: f.name, size: f.size, url: URL.createObjectURL(f) }))]
    setFiles(files)
  }
  const setFiles = (files: AssetFile[]) => {
    setValue('files', files, { shouldDirty: editing })
    // read-only view: attachments persist straight away
    if (ro && asset) save.mutate({ id: asset.id, data: { ...asset, files } })
  }

  const errGen = !!(e.name || e.code || e.buy || e.use || e.method || e.category || e.assetAccount || e.accumAccount || e.expenseAccount || e.qty || e.years || e.months)
  const secs = [
    { k: 'gen' as const, n: faT.gen, ic: 'ph-light ph-file-text', err: errGen },
    { k: 'exp' as const, n: faT.exp, ic: 'ph-light ph-coins', err: !!e.expenses },
    { k: 'oth' as const, n: faT.oth, ic: 'ph-light ph-info', err: !!e.location },
    ...(asset ? [{ k: 'his' as const, n: faT.his, ic: 'ph-light ph-clock-counter-clockwise', err: false }] : []),
  ]
  const history = asset ? assetJournals(asset.code) : []
  const inBg = ro ? 'bg-[rgba(var(--fg),.03)]' : 'bg-[rgba(var(--fg),.06)]'
  const inp = cn('w-full rounded-[14px] border border-[rgba(var(--fg),.18)] px-[14px] py-[11px] text-[13px] text-(--ink) outline-none', inBg)
  const accounts = useLeafAccounts()
  const accOpts = (type: string) => accounts.filter((a) => a.type === type).map((a) => ({ v: a.code, n: a.name, c: a.code, t: a.type }))
  const plain = (xs: string[]) => xs.map((x) => ({ v: x, n: x }))

  const picker = (name: 'category' | 'assetAccount' | 'accumAccount' | 'expenseAccount' | 'location' | 'department', label: string, ph: string, opts: { v: string; n: string }[], req = true) => (
    <Controller
      key={name}
      control={control}
      name={name}
      render={({ field, fieldState }) => <Picker label={label} req={req} ph={ph} opts={opts} value={field.value} onPick={(x) => field.onChange(x)} ro={ro} invalid={!!fieldState.error} />}
    />
  )
  const num = (name: 'qty' | 'years' | 'months') => ({
    inputMode: 'numeric' as const,
    readOnly: ro,
    value: String(v[name] ?? 0),
    onChange: (ev: React.ChangeEvent<HTMLInputElement>) => setValue(name, parseNum(ev.target.value), { shouldDirty: true, shouldValidate: formState.isSubmitted }),
  })

  return (
    <DocHeader label={t(tx.title)} current={asset ? asset.code : t(faT.newTitle)} onClose={close}>
      <form onSubmit={onSave} className={cn('glass-card relative', isMobile ? 'px-4 py-[18px]' : 'px-6 py-[22px]')}>
        <div className="flex flex-wrap items-start gap-4">
          <div className="grid min-w-0 flex-[1_1_520px] grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-[14px]">
            <Field label={t(faT.name)} req className="col-span-full">
              <input {...register('name')} readOnly={ro} placeholder={t(faT.namePh)} className={cn(inp, e.name && bad)} />
            </Field>
            <div className="flex flex-col gap-1.5 text-[11px]">
              <span className="opacity-75">
                {t(faT.code)} <span className="text-[#ec4899]">*</span>
              </span>
              {editing ? (
                <div className="flex items-center gap-2.5">
                  <Switch
                    title={t(faT.auto)}
                    checked={v.autoCode}
                    onCheckedChange={(c) => setValue('autoCode', c, { shouldDirty: true })}
                    className="h-5 w-9 flex-none border-0 transition-[background] duration-150 data-checked:bg-(--ink) data-unchecked:bg-[rgba(var(--fg),.2)] dark:data-checked:bg-(--ink) dark:data-unchecked:bg-[rgba(var(--fg),.2)] [&>span]:size-4 [&>span]:bg-(--paper) dark:[&>span]:bg-(--paper) [&>span]:data-checked:translate-x-[18px] [&>span]:data-unchecked:translate-x-0.5"
                  />
                  {v.autoCode ? (
                    <Dropdown value={v.codeType} options={codeTypes} noClear onSelect={(x) => setValue('codeType', x, { shouldDirty: true })} invalid={!!e.code} className="min-w-0 flex-1" />
                  ) : (
                    <input {...register('code')} placeholder="FAA.2026.10.00010" className={cn('field min-w-0 flex-1 px-[14px] py-[11px] outline-none', e.code && bad)} />
                  )}
                </div>
              ) : (
                <input value={v.code} readOnly className={cn(roIn, 'tabular-nums')} />
              )}
            </div>
            {(['buy', 'use'] as const).map((k) => (
              <div key={k} className="flex flex-col gap-1.5 text-[11px]">
                <span className="opacity-75">
                  {t(faT[k])} <span className="text-[#ec4899]">*</span>
                </span>
                {editing ? (
                  <Controller control={control} name={k} render={({ field, fieldState }) => <DatePicker value={field.value} onChange={field.onChange} invalid={!!fieldState.error} />} />
                ) : (
                  <input value={fmtDate(v[k])} readOnly className={roIn} />
                )}
              </div>
            ))}
          </div>

          <div className="ml-auto flex flex-none flex-wrap items-center gap-2 pt-5">
            {filesStored && (<Popover open={attOpen} onOpenChange={setAttOpen}>
              <PopoverTrigger asChild>
                <span className={cn('flex cursor-pointer items-center gap-2 rounded-[18px] border border-[rgba(var(--fg),.18)] px-[14px] py-[9px] text-[12px] hover:bg-[rgba(var(--fg),.14)]', attOpen ? 'bg-[rgba(var(--fg),.14)]' : 'bg-[rgba(var(--fg),.06)]')}>
                  <i className="ph-light ph-paperclip text-[16px]" />
                  {t(faT.att)}
                  {v.files.length > 0 && <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-[9px] bg-[#ec4899] px-[5px] text-[10.5px] font-normal text-white">{v.files.length}</span>}
                  <svg width="8" height="5" viewBox="0 0 8 5">
                    <path d="M1 1l3 3 3-3" style={{ stroke: 'var(--ink)' }} fill="none" />
                  </svg>
                </span>
              </PopoverTrigger>
              <PopoverContent align="end" sideOffset={10} className={cn(menuPanel, 'w-[340px] max-w-[calc(100vw-48px)] rounded-[22px] p-[14px] text-(--ink)')}>
                <div className="mb-2.5 flex items-center justify-between">
                  <span className="text-[14px]">{t(faT.att)}</span>
                  <span className="text-[11px] opacity-55">{v.files.length}</span>
                </div>
                <div
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(ev) => {
                    ev.preventDefault()
                    setDragging(true)
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(ev) => {
                    ev.preventDefault()
                    setDragging(false)
                    addFiles(ev.dataTransfer.files)
                  }}
                  className={cn(
                    'flex cursor-pointer flex-col items-center gap-1.5 rounded-[16px] border border-dashed px-3 py-[18px] text-center transition-[background] duration-150',
                    dragging ? 'border-[#ec4899] bg-[rgba(236,72,153,.1)]' : 'border-[rgba(var(--fg),.25)] bg-[rgba(var(--fg),.04)]',
                  )}
                >
                  <i className="ph-light ph-cloud-arrow-up text-[26px] opacity-75" />
                  <span className="text-[12.5px]">
                    {t(faT.drop)} <span className="underline">{t(faT.pick)}</span>
                  </span>
                  <span className="text-[10.5px] opacity-55">{t(faT.attHint)}</span>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  hidden
                  onChange={(ev) => {
                    addFiles(ev.target.files)
                    ev.target.value = ''
                  }}
                />
                <div className="mt-2.5 flex max-h-[220px] flex-col gap-0.5 overflow-y-auto">
                  {v.files.map((f, i) => (
                    <div key={f.name + i} className="flex animate-[fade_.2s] items-center gap-2.5 rounded-[12px] p-2 hover:bg-[rgba(var(--fg),.08)]">
                      <span className="flex size-8 flex-none items-center justify-center rounded-[10px] bg-[rgba(var(--fg),.1)] text-[17px]">
                        <i className={/\.(png|jpe?g|gif|webp)$/i.test(f.name) ? 'ph-light ph-image' : /\.pdf$/i.test(f.name) ? 'ph-light ph-file-pdf' : 'ph-light ph-file'} />
                      </span>
                      <a href={f.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 text-(--ink)">
                        <div className="truncate text-[12.5px]">{f.name}</div>
                        <div className="mt-0.5 text-[10.5px] opacity-55">{f.size >= 1e6 ? `${(f.size / 1e6).toFixed(1)} MB` : `${Math.ceil(f.size / 1e3)} KB`}</div>
                      </a>
                      <span
                        onClick={() => setFiles(v.files.filter((_, j) => j !== i))}
                        className="flex size-6 flex-none cursor-pointer items-center justify-center rounded-full text-[15px] leading-none opacity-60 hover:bg-[rgba(var(--fg),.15)] hover:opacity-100"
                      >
                        ×
                      </span>
                    </div>
                  ))}
                  {!v.files.length && <div className="px-1 pt-2.5 pb-0.5 text-center text-[12px] opacity-50">{t(faT.attNone)}</div>}
                </div>
              </PopoverContent>
            </Popover>)}
            {ro && (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <span className="flex cursor-pointer items-center gap-2 rounded-[18px] border border-[rgba(var(--fg),.18)] bg-[rgba(var(--fg),.06)] px-[14px] py-[9px] text-[12px] outline-none hover:bg-[rgba(var(--fg),.14)]">
                      {t(faT.proc)}
                      <svg width="8" height="5" viewBox="0 0 8 5">
                        <path d="M1 1l3 3 3-3" style={{ stroke: 'var(--ink)' }} fill="none" />
                      </svg>
                    </span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" sideOffset={10} className={cn(popBox, 'w-[230px]')}>
                    {procs.map((p) => (
                      <DropdownMenuItem key={p.id} className={popItem} onSelect={() => showToast(`${t(p)} — ${asset!.code}`)}>
                        {t(p)}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <span aria-label="More" className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-[rgba(var(--fg),.18)] bg-[rgba(var(--fg),.06)] text-[18px] outline-none hover:bg-[rgba(var(--fg),.14)]">
                      <i className="ph-light ph-dots-three" />
                    </span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" sideOffset={10} className={cn(popBox, 'w-[180px]')}>
                    <DropdownMenuItem className={popItem} onSelect={() => setEditing(true)}>
                      <i className="ph-light ph-pencil-simple" />
                      {t(faT.edit)}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className={popItem}
                      onSelect={() => {
                        draft = { ...getValues(), name: `${getValues('name')} (copy)`, autoCode: true, codeType: codeTypes[0]!, code: '', files: [] }
                        nav({ to: '/fixed-assets/new' })
                      }}
                    >
                      <i className="ph-light ph-copy" />
                      {t(faT.dup)}
                    </DropdownMenuItem>
                    <DropdownMenuItem className={cn(popItem, 'text-[#ef4444] focus:bg-[rgba(239,68,68,.12)] focus:text-[#ef4444]')} onSelect={() => setConfirmDel(true)}>
                      <i className="ph-light ph-trash" />
                      {t(faT.del)}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </div>

        <div className="mt-6 box-border flex w-max max-w-full gap-1 overflow-x-auto rounded-[20px] bg-[rgba(var(--fg),.08)] p-1 [scrollbar-width:none]">
          {secs.map((s) => (
            <span
              key={s.k}
              onClick={() => setSec(s.k)}
              className={cn('flex flex-none cursor-pointer items-center gap-2 rounded-[16px] px-[14px] py-2 text-[12px] whitespace-nowrap', sec === s.k && 'bg-(--ink) text-(--paper)')}
            >
              <i className={cn(s.ic, 'text-[15px]')} />
              {t(s.n)}
              {s.err && <span className="size-1.5 rounded-full bg-[#ef4444]" />}
            </span>
          ))}
        </div>

        <div className="mt-5 min-h-[300px]">
          {sec === 'gen' && (
            <div className="grid animate-[fade_.2s] grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] items-start gap-x-10 gap-y-4">
              <div className="flex min-w-0 flex-col gap-[14px]">
                <div className="flex flex-col gap-2 text-[11px]">
                  <span className="opacity-75">{t(faT.intan)}</span>
                  <Check checked={v.intangible} ro={ro} label={t(faT.yes)} onChange={(c) => setValue('intangible', c, { shouldDirty: true })} />
                </div>
                <Field label={t(faT.method)}>
                  <Dropdown value={v.method} options={methods} noClear disabled={ro} onSelect={(x) => setValue('method', x, { shouldDirty: true })} className={cn('w-full', ro && 'bg-[rgba(var(--fg),.03)] disabled:opacity-100')} />
                </Field>
                {picker('category', t(faT.cat), t(faT.catPh), plain(categories))}
                {picker('assetAccount', t(faT.accAsset), t(faT.accPh), accOpts('Aset Tetap'))}
                {picker('accumAccount', t(faT.accAccum), t(faT.accPh), accOpts('Akumulasi Penyusutan'))}
                {picker('expenseAccount', t(faT.accExp), t(faT.accPh), accOpts('Beban'))}
              </div>
              <div className="flex max-w-[420px] min-w-0 flex-col gap-[14px]">
                <Field label={t(faT.qty)} req>
                  <input {...num('qty')} className={cn(inp, 'text-right tabular-nums', e.qty && bad)} />
                </Field>
                <div className="flex flex-col gap-1.5 text-[11px]">
                  <span className="opacity-75">
                    {t(faT.life)} <span className="text-[#ec4899]">*</span>
                  </span>
                  <div className="grid grid-cols-2 gap-2.5">
                    {(['years', 'months'] as const).map((k) => (
                      <span key={k} className={cn('flex items-center overflow-hidden rounded-[14px] border border-[rgba(var(--fg),.18)]', inBg, (e.years || e.months) && bad)}>
                        <input {...num(k)} placeholder="0" className="min-w-0 flex-1 border-0 bg-transparent py-[11px] pr-2 pl-[14px] text-right text-[13px] text-(--ink) tabular-nums outline-none" />
                        <span className="flex-none pr-[14px] pl-1 text-[12px] opacity-60">{t(k === 'years' ? faT.yrs : faT.mos)}</span>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 text-[11px]">
                  <span className="opacity-75">{t(faT.ratio)}</span>
                  <span className="flex items-center justify-end gap-1.5 rounded-[14px] border border-[rgba(var(--fg),.12)] bg-[rgba(var(--fg),.03)] px-[14px] py-[11px] text-[13px] tabular-nums">
                    {ratio.toLocaleString('id-ID', { maximumFractionDigits: 2 })}
                    <span className="opacity-60">%</span>
                  </span>
                </div>
                <div className="flex flex-col gap-1.5 text-[11px]">
                  <span className="opacity-75">{t(faT.salv)}</span>
                  <span className={cn('flex items-center overflow-hidden rounded-[14px] border border-[rgba(var(--fg),.18)]', inBg)}>
                    <span className="flex-none pr-1 pl-[14px] text-[12px] opacity-60">Rp</span>
                    <input
                      inputMode="numeric"
                      readOnly={ro}
                      placeholder="0"
                      value={v.salvage ? fmtIdr(v.salvage) : ''}
                      onChange={(ev) => setValue('salvage', parseNum(ev.target.value), { shouldDirty: true })}
                      className="min-w-0 flex-1 border-0 bg-transparent py-[11px] pr-[14px] pl-2 text-right text-[13px] text-(--ink) tabular-nums outline-none"
                    />
                  </span>
                </div>
              </div>
            </div>
          )}

          {sec === 'oth' && (
            <div className="grid animate-[fade_.2s] grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] items-start gap-x-10 gap-y-4">
              <div className="flex min-w-0 flex-col gap-[14px]">
                {picker('location', t(faT.loc), t(faT.locPh), plain(locations.filter((b) => b !== 'Semua')))}
                {picker('department', t(faT.dept), t(faT.deptPh), plain(departments), false)}
                {ro && (
                  <Field label={t(faT.branch)}>
                    <input value={t(faT.hq)} readOnly className={roIn} />
                  </Field>
                )}
                <Field label={t(faT.note)}>
                  <textarea {...register('note')} readOnly={ro} rows={4} className={cn(inp, 'resize-y')} />
                </Field>
              </div>
              <div className="flex max-w-[420px] min-w-0 flex-col gap-[14px]">
                {ro && (
                  <Field label={t(faT.lastDep)}>
                    <input value={fmtDate(asset?.lastDep ?? '') || '—'} readOnly className={roIn} />
                  </Field>
                )}
                <div className="flex flex-col gap-2 text-[11px]">
                  <span className="opacity-75">{t(faT.tax)}</span>
                  <Check checked={v.tax} ro={ro} label={t(faT.yes)} onChange={(c) => setValue('tax', c, { shouldDirty: true })} />
                </div>
              </div>
            </div>
          )}

          {sec === 'his' && (
            <div className="flex animate-[fade_.2s] flex-col gap-3">
              {history.map((j) => (
                <div key={j.jv} className="overflow-hidden rounded-[16px] border border-[rgba(var(--fg),.12)]">
                  <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[rgba(var(--fg),.1)] px-4 py-[11px] text-[13px]">
                    <span>
                      <span className="tabular-nums">{j.jv}</span> · {j.description}
                    </span>
                    <span className="text-[11px] tabular-nums opacity-60">{j.date}</span>
                  </div>
                  {j.lines.map((l, i) => (
                    <div key={i} data-rf-row="1" className="grid grid-cols-[1fr_120px_120px] gap-3 px-4 py-2 text-[12.5px]">
                      <span className="truncate">
                        <span className="tabular-nums opacity-60">{l.account}</span> {fixtureAccounts.find((a) => a.code === l.account)?.name}
                      </span>
                      <span className="text-right tabular-nums">{l.debit ? fmtIdr(l.debit) : ''}</span>
                      <span className="text-right tabular-nums">{l.credit ? fmtIdr(l.credit) : ''}</span>
                    </div>
                  ))}
                </div>
              ))}
              {!history.length && <div className="px-4 py-7 text-center text-[13px] opacity-50">{t(faT.hisNone)}</div>}
            </div>
          )}

          {sec === 'exp' && (
            <div className="animate-[fade_.2s]">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-[14px]">
                {editing && (
                  <div className="min-w-0 flex-[0_1_420px]">
                    <Picker
                      chipless
                      label={t(faT.expPick)}
                      ph={t(faT.expPh)}
                      opts={expenditures.filter((x) => !v.expenses.some((y) => y.code === x.code)).map((x) => ({ v: x.code, n: x.desc, c: x.code, t: fmtIdr(x.amount) }))}
                      onPick={(c) => setValue('expenses', [...v.expenses, expenditures.find((x) => x.code === c)!], { shouldDirty: true, shouldValidate: formState.isSubmitted })}
                    />
                  </div>
                )}
                <span className="ml-auto text-[15px]">
                  {t(faT.exp)} <span className="text-[#ec4899]">*</span>
                </span>
              </div>
              <div className={cn('overflow-hidden rounded-[16px] border border-[rgba(var(--fg),.12)]', e.expenses && bad)}>
                <div className="overflow-x-auto">
                  <div className="min-w-[600px]">
                    <div className="grid grid-cols-[1fr_1.6fr_1fr_1fr_32px] gap-3 border-b border-[rgba(var(--fg),.1)] px-4 py-[11px] text-[11px] opacity-55">
                      <span>{t(faT.cCode)}</span>
                      <span>{t(faT.cDesc)}</span>
                      <span>{t(faT.cDate)}</span>
                      <span className="text-right">{t(faT.cAmt)}</span>
                      <span />
                    </div>
                    {v.expenses.map((x, i) => {
                      const patch = (p: Partial<typeof x>) => setValue('expenses', v.expenses.map((y, j) => (j === i ? { ...y, ...p } : y)), { shouldDirty: true })
                      return (
                        <div key={x.code} data-rf-row="1" className="grid min-h-[52px] animate-[fade_.2s] grid-cols-[1fr_1.6fr_1fr_1fr_32px] items-center gap-3 border-b border-[rgba(var(--fg),.07)] px-4 py-2 text-[13px]">
                          <span className="tabular-nums">{x.code}</span>
                          <span>{x.desc}</span>
                          {editing ? (
                            <>
                              <DatePicker value={x.date} onChange={(d) => patch({ date: d })} invalid={!x.date} />
                              <input
                                inputMode="numeric"
                                placeholder="0"
                                value={x.amount ? fmtIdr(x.amount) : ''}
                                onChange={(ev) => patch({ amount: parseNum(ev.target.value) })}
                                className={cn('field min-w-0 rounded-[10px] px-2.5 py-2 text-right tabular-nums outline-none', !x.amount && bad)}
                              />
                            </>
                          ) : (
                            <>
                              <span className="opacity-75">{fmtDate(x.date)}</span>
                              <span className="text-right tabular-nums">{fmtIdr(x.amount)}</span>
                            </>
                          )}
                          <span className="flex justify-end">
                            {editing && (
                              <span
                                onClick={() => setValue('expenses', v.expenses.filter((_, j) => j !== i), { shouldDirty: true })}
                                className="flex size-6 cursor-pointer items-center justify-center rounded-full text-[15px] leading-none opacity-60 hover:bg-[rgba(var(--fg),.15)] hover:opacity-100"
                              >
                                ×
                              </span>
                            )}
                          </span>
                        </div>
                      )
                    })}
                    {!v.expenses.length && <div className="px-4 py-7 text-center text-[13px] opacity-50">{t(faT.none)}</div>}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={cn('mt-[18px] flex justify-between gap-[18px] border-t border-[rgba(var(--fg),.1)] pt-[18px]', isMobile ? 'flex-col items-stretch' : 'flex-row items-end')}>
          <div className="flex gap-2">
            {editing ? (
              <>
                <button type="submit" disabled={save.isPending} className={cn('cursor-pointer rounded-[20px] bg-(--ink) px-[22px] py-3 text-center text-[13px] font-normal text-(--paper) disabled:opacity-60', isMobile && 'flex-1')}>
                  {L.save}
                </button>
                <button type="button" onClick={cancel} className="cursor-pointer rounded-[20px] bg-[rgba(var(--fg),.1)] px-[18px] py-3 text-[13px]">
                  {L.cancel}
                </button>
              </>
            ) : (
              <button type="button" onClick={close} className="cursor-pointer rounded-[20px] bg-[rgba(var(--fg),.1)] px-[18px] py-3 text-[13px]">
                {t(faT.close)}
              </button>
            )}
          </div>
          <div className={cn('flex gap-9 text-[11px]', isMobile ? 'justify-between' : 'justify-end')}>
            <div>
              <div className="opacity-60">{t(faT.total)}</div>
              <div className="mt-1 text-[20px] tabular-nums">{fmtIdr(total)}</div>
            </div>
            <div>
              <div className="opacity-60">{t(faT.book)}</div>
              <div className="-mt-0.5 text-[30px] font-extralight tabular-nums">{fmtIdr(book)}</div>
            </div>
          </div>
        </div>
      </form>

      <AlertDialog open={confirmDel} onOpenChange={setConfirmDel}>
        <AlertDialogContent className="glass-pop rounded-[24px] border-[rgba(var(--fg),.16)] text-(--ink)">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[16px] font-normal">{t(faT.delQ)}</AlertDialogTitle>
            <AlertDialogDescription className="text-[13px] text-(--ink) opacity-70">
              {asset?.code} · {asset?.name}. {t(faT.delD)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="border-0 bg-transparent">
            <AlertDialogCancel className="rounded-[20px] border-0 bg-[rgba(var(--fg),.1)] text-(--ink)">{L.cancel}</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-[20px] bg-[#ef4444] text-white hover:bg-[#dc2626]"
              onClick={async () => {
                await del.mutateAsync(asset!.id)
                showToast(t(faT.deleted))
                close()
              }}
            >
              {t(faT.del)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DocHeader>
  )
}
