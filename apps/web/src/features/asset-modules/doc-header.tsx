import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { useShell } from '@/lib/shell'

export interface DocSub {
  name: string
  to: string
  active?: boolean
  onClose?: () => void
}

/** Page frame of the design's `isDoc` view: module eyebrow, title, segmented sub-tabs. */
export function DocFrame({ mod, label, subs, children }: { mod: string; label: string; subs: DocSub[]; children: ReactNode }) {
  const { isMobile } = useShell()
  return (
    <div className="flex-none animate-[fade_.25s] pt-5 pb-8" style={{ paddingInline: isMobile ? 16 : 32 }}>
      <div className="mb-[18px] flex flex-wrap items-end justify-between gap-[14px]">
        <div>
          <div className="text-[11px] tracking-[.5px] uppercase opacity-60">{mod}</div>
          <h1 className="mt-1 font-normal tracking-[-.3px]" style={{ fontSize: isMobile ? 22 : 28 }}>{label}</h1>
        </div>
        <nav className="flex gap-1 rounded-[20px] bg-[rgba(var(--fg),.08)] p-1">
          {subs.map((s) => (
            <Link
              key={s.to}
              to={s.to}
              className={`flex cursor-pointer items-center gap-2 rounded-2xl px-[14px] py-2 text-[12px] ${s.active ? 'bg-(--ink) text-(--paper)' : 'text-(--ink)'}`}
            >
              {s.name}
              {s.onClose && (
                <span
                  role="button"
                  aria-label="Tutup"
                  className="text-[14px] leading-none opacity-60 hover:opacity-100"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    s.onClose!()
                  }}
                >
                  ×
                </span>
              )}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </div>
  )
}
