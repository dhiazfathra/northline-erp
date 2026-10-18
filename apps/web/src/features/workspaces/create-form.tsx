import { createWorkspaceSchema, type CreateWorkspaceInput } from '@northline/schemas/workspace'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useCreateWorkspace } from '@/api/workspaces'
import { Dropdown } from '@/components/dropdown'
import { useShell, useT } from '@/lib/shell'
import { cn } from '@/lib/utils'
import { Logo, negC } from './chrome'

const industries = { id: 'Ritel,Distribusi,Logistik,Konstruksi,Kesehatan,Teknologi,Makanan & Minuman', en: 'Retail,Distribution,Logistics,Construction,Healthcare,Technology,Food & Beverage' }
const employees = ['1–10', '11–50', '51–200', '201–500', '500+']

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <span className="flex-[0_0_140px] text-[13px] opacity-85">
        {label}
        <span className="ml-0.5" style={{ color: negC }}>
          *
        </span>
      </span>
      <div className="min-w-0 flex-[1_1_240px]">{children}</div>
    </div>
  )
}

export function CreateWorkspaceForm() {
  const { L, isMobile, showToast } = useShell()
  const t = useT()
  const navigate = useNavigate()
  const create = useCreateWorkspace()
  const fileRef = useRef<HTMLInputElement>(null)
  const [logo, setLogo] = useState<string | null>(null)
  const [logoErr, setLogoErr] = useState('')
  const { register, control, handleSubmit, formState } = useForm<CreateWorkspaceInput>({
    resolver: zodResolver(createWorkspaceSchema),
    mode: 'onChange',
    defaultValues: { name: '', alias: '', type: '', industry: '', employees: '' },
  })
  const { errors, isSubmitted, isValid } = formState
  const bad = (k: keyof CreateWorkspaceInput) => isSubmitted && !!errors[k]
  useEffect(() => () => void (logo && URL.revokeObjectURL(logo)), [logo])

  const cancel = () => navigate({ to: '/workspaces' })
  const onPick = (f?: File) => {
    if (!f) return
    if (!['image/png', 'image/jpeg'].includes(f.type)) return setLogoErr(t({ id: 'Format harus PNG atau JPG', en: 'File must be PNG or JPG' }))
    if (f.size > 2 * 1024 * 1024) return setLogoErr(t({ id: 'Ukuran file melebihi 2 MB', en: 'File exceeds 2 MB' }))
    setLogoErr('')
    setLogo(URL.createObjectURL(f))
  }
  const onSubmit = (v: CreateWorkspaceInput) =>
    create.mutate(v, {
      onSuccess: (ws) => {
        showToast(t({ id: `${ws.name} dibuat`, en: `${ws.name} created` }))
        navigate({ to: '/' })
      },
    })
  const fieldCls = (k: keyof CreateWorkspaceInput) =>
    cn('w-full rounded-[14px] bg-[rgba(var(--fg),.06)] px-3.5 py-[11px] text-[13px] text-(--ink) outline-none border', bad(k) ? 'border-[#f87171]' : 'border-[rgba(var(--fg),.18)]')

  return (
    <div className="absolute inset-0 z-[79] box-border flex animate-[fade_.2s] items-center justify-center bg-[rgba(0,0,0,.45)] p-4 backdrop-blur-[4px]" onClick={cancel}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        onClick={(e) => e.stopPropagation()}
        className="relative m-0 box-border flex h-[min(680px,100%)] w-[min(960px,100%)] animate-[pop_.22s_ease-out] overflow-hidden rounded-[28px] border border-[rgba(var(--fg),.16)] bg-(--panel) shadow-[0_30px_70px_rgba(0,0,0,.4)] backdrop-blur-[26px]"
      >
        <button
          type="button"
          aria-label={L.crBack}
          onClick={cancel}
          className="absolute top-4 right-4 z-[2] flex size-8 cursor-pointer items-center justify-center rounded-full bg-[rgba(var(--fg),.1)] hover:bg-[rgba(var(--fg),.18)]"
        >
          <i className="ph-light ph-x text-[15px]" />
        </button>
        {!isMobile && (
          <div className="box-border flex min-w-0 flex-[0_0_36%] flex-col gap-[18px] border-r border-[rgba(var(--fg),.1)] bg-[rgba(var(--fg),.05)] px-8 py-9">
            <Logo />
            <div className="mt-2.5 text-2xl leading-[1.2] font-light tracking-[-.4px] text-pretty">{L.crSideH}</div>
            <div className="text-[13px] leading-[1.55] text-pretty opacity-70">{L.crSideP}</div>
            <div className="flex min-h-[120px] flex-1 items-center justify-center rounded-[20px] border border-[rgba(var(--fg),.12)] [background:repeating-linear-gradient(135deg,rgba(var(--fg),.05)_0_10px,transparent_10px_20px)]">
              <span className="font-mono text-[11px] opacity-55">illustration</span>
            </div>
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="box-border min-h-0 flex-1 overflow-y-auto px-8 pt-9 pb-6">
            <div className="pr-9">
              <div className="text-[22px] leading-[1.2]">{L.crTitle}</div>
              <div className="mt-1.5 text-[12.5px] text-pretty opacity-60">{L.crSub}</div>
            </div>
            <div className="mt-7 flex flex-col gap-3.5">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="flex-[0_0_140px] text-[13px] opacity-85">{L.crLogo}</span>
                <div className="flex min-w-0 flex-[1_1_240px] items-center gap-[18px]">
                  <span
                    className="flex size-[84px] flex-none items-center justify-center overflow-hidden rounded-full border border-dashed border-[rgba(var(--fg),.25)] bg-[rgba(var(--fg),.08)] bg-cover bg-center"
                    style={logo ? { backgroundImage: `url(${logo})` } : undefined}
                  >
                    {!logo && <i className="ph-light ph-image text-[28px] opacity-50" />}
                  </span>
                  <div className="flex min-w-0 flex-col items-start gap-2">
                    <input ref={fileRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => onPick(e.target.files?.[0])} />
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="flex cursor-pointer items-center gap-1.5 rounded-2xl bg-(--ink) px-3.5 py-2 text-xs font-normal text-(--paper)"
                    >
                      <i className="ph-light ph-upload-simple text-[13px]" />
                      {logo ? t({ id: 'Ganti logo', en: 'Change logo' }) : t({ id: 'Unggah logo', en: 'Upload logo' })}
                    </button>
                    <div className="text-[11px] leading-normal opacity-60">{L.crMax}</div>
                    {logoErr && (
                      <span className="text-[11px]" style={{ color: negC }}>
                        {logoErr}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <Row label={L.crName}>
                <input {...register('name')} placeholder={L.crNamePh} autoFocus className={fieldCls('name')} />
              </Row>
              <Row label={L.crAlias}>
                <input {...register('alias')} placeholder={L.crAliasPh} className={fieldCls('alias')} />
              </Row>
              <Row label={L.crType}>
                <Controller control={control} name="type" render={({ field }) => <Dropdown value={field.value} onSelect={field.onChange} options={L.crTypes.split(',')} placeholder={L.crTypePh} invalid={bad('type')} />} />
              </Row>
              <Row label={L.crInd}>
                <Controller control={control} name="industry" render={({ field }) => <Dropdown value={field.value} onSelect={field.onChange} options={t(industries).split(',')} placeholder={L.crIndPh} invalid={bad('industry')} />} />
              </Row>
              <Row label={L.crEmp}>
                <Controller control={control} name="employees" render={({ field }) => <Dropdown value={field.value} onSelect={field.onChange} options={employees} placeholder={L.crEmpPh} invalid={bad('employees')} />} />
              </Row>
            </div>
          </div>
          <div className="flex flex-none items-center justify-end gap-2.5 border-t border-[rgba(var(--fg),.1)] px-6 py-4">
            {isSubmitted && !isValid && (
              <span className="min-w-0 flex-1 text-[11.5px]" style={{ color: negC }}>
                {L.crReq}
              </span>
            )}
            <button
              type="button"
              title={L.crBack}
              aria-label={L.crBack}
              onClick={cancel}
              className="flex size-11 flex-none cursor-pointer items-center justify-center rounded-2xl bg-[rgba(var(--fg),.1)] hover:bg-[rgba(var(--fg),.18)]"
            >
              <i className="ph-light ph-arrow-left text-[17px]" />
            </button>
            <button
              type="submit"
              disabled={create.isPending}
              className={cn(
                'h-11 flex-none cursor-pointer rounded-2xl px-[22px] text-[13px] font-normal transition-[background,color] duration-150',
                isValid ? 'bg-(--ink) text-(--paper)' : 'bg-[rgba(var(--fg),.12)] text-[rgba(var(--fg),.45)]',
              )}
            >
              {L.crBtn}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
