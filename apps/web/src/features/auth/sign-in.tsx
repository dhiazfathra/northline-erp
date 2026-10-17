import { signInSchema, type SignInInput } from '@northline/schemas/auth'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { BareFooter, BareHeader, heavyGlass, negC } from '@/features/workspaces/chrome'
import { useShell, useT } from '@/lib/shell'
import { cn } from '@/lib/utils'

const tx = {
  title: { id: 'Masuk', en: 'Sign in' },
  sub: { id: 'Gunakan email kerja Anda untuk membuka database perusahaan.', en: 'Use your work email to open your company databases.' },
  email: { id: 'Email', en: 'Email' },
  pw: { id: 'Kata sandi', en: 'Password' },
  forgot: { id: 'Lupa kata sandi?', en: 'Forgot password?' },
  resetSent: { id: 'Tautan atur ulang dikirim ke email Anda', en: 'Reset link sent to your email' },
  show: { id: 'Tampilkan kata sandi', en: 'Show password' },
  hide: { id: 'Sembunyikan kata sandi', en: 'Hide password' },
  badEmail: { id: 'Masukkan email yang valid', en: 'Enter a valid email' },
  badPw: { id: 'Minimal 8 karakter', en: 'At least 8 characters' },
  btn: { id: 'Masuk', en: 'Sign in' },
}

export function SignIn() {
  const { L, isMobile, isDesktop, showToast } = useShell()
  const t = useT()
  const navigate = useNavigate()
  const [showPw, setShowPw] = useState(false)
  const { register, handleSubmit, formState } = useForm<SignInInput>({ resolver: zodResolver(signInSchema), defaultValues: { email: '', password: '' } })
  const { errors, isSubmitting } = formState
  // shortcut: no auth backend yet; any valid credentials go straight to the tenant picker.
  const onSubmit = () => navigate({ to: '/workspaces' })

  const fields = [
    { k: 'email' as const, label: t(tx.email), type: 'email', ph: 'nama@perusahaan.co.id', ac: 'email', err: errors.email && t(tx.badEmail) },
    { k: 'password' as const, label: t(tx.pw), type: showPw ? 'text' : 'password', ph: '••••••••', ac: 'current-password', err: errors.password && t(tx.badPw) },
  ]

  return (
    <div className="flex min-h-0 flex-1 animate-[fade_.25s] flex-col overflow-y-auto">
      <BareHeader />
      <div
        className={cn(
          'box-border grid flex-1 items-center gap-20',
          isDesktop ? 'grid-cols-[1fr_auto] justify-items-start px-8 py-10' : 'grid-cols-1 justify-items-center',
          isMobile ? 'px-4 py-6' : !isDesktop && 'px-8 py-10',
        )}
      >
        {isDesktop && (
          <div className="max-w-[640px]">
            <div className="text-[11px] tracking-[.5px] uppercase opacity-60">{L.ledger}</div>
            <div className="mt-[18px] text-[64px] leading-[1.03] font-extralight tracking-[-2px] text-pretty">{L.heroTitle}</div>
            <div className="mt-6 max-w-[440px] text-[15px] leading-normal text-pretty opacity-70">{L.heroSub}</div>
          </div>
        )}
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className={cn('m-0 box-border flex max-w-full animate-[pop_.25s_ease-out] flex-col rounded-[32px]', heavyGlass, isMobile ? 'w-full p-6' : 'w-[440px] p-9')}
        >
          <div className={cn('leading-[1.1] tracking-[-.5px]', isMobile ? 'text-[26px]' : 'text-[30px]')}>{isDesktop ? t(tx.title) : L.heroTitle}</div>
          <div className="mt-2 text-[13px] leading-[1.45] text-pretty opacity-65">{isDesktop ? t(tx.sub) : L.heroSub}</div>
          <div className="mt-[26px] grid grid-cols-1 gap-3.5">
            {fields.map((f) => (
              <label key={f.k} className="flex min-w-0 flex-col gap-1.5 text-[11px]">
                <span className="flex items-center justify-between opacity-85">
                  <span>{f.label}</span>
                  {f.k === 'password' && (
                    <button type="button" onClick={() => showToast(t(tx.resetSent))} className="cursor-pointer underline underline-offset-[3px] hover:text-[#ec4899]">
                      {t(tx.forgot)}
                    </button>
                  )}
                </span>
                <span
                  className={cn(
                    'flex items-center rounded-[14px] border bg-[rgba(var(--fg),.06)] transition-[border-color] duration-150',
                    f.err ? 'border-[#f87171]' : 'border-[rgba(var(--fg),.18)] focus-within:border-[rgba(var(--fg),.4)]',
                  )}
                >
                  <input
                    {...register(f.k)}
                    type={f.type}
                    placeholder={f.ph}
                    autoComplete={f.ac}
                    className="min-w-0 flex-1 border-none bg-transparent px-3.5 py-[13px] text-sm text-(--ink) outline-none"
                  />
                  {f.k === 'password' && (
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      title={t(showPw ? tx.hide : tx.show)}
                      aria-label={t(showPw ? tx.hide : tx.show)}
                      className="flex size-[42px] flex-none cursor-pointer items-center justify-center text-[17px] opacity-70 hover:opacity-100"
                    >
                      <i className={cn('ph-light', showPw ? 'ph-eye-slash' : 'ph-eye')} />
                    </button>
                  )}
                </span>
                {f.err && <span style={{ color: negC }}>{f.err}</span>}
              </label>
            ))}
          </div>
          <button type="submit" disabled={isSubmitting} className="mt-6 h-12 cursor-pointer rounded-[18px] bg-(--ink) text-sm font-normal text-(--paper)">
            {t(tx.btn)}
          </button>
        </form>
      </div>
      <BareFooter />
    </div>
  )
}
