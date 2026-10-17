import type { AiMessage } from '@northline/schemas/reports'
import { Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { aiGreeting, aiNow, useAskAi } from '@/api/reports'
import { useShell, useT } from '@/lib/shell'
import { cn } from '@/lib/utils'
import { iconBtn } from './ui'

const tx = {
  asOf: { id: 'Data per 17/10/2026 10:24', en: 'Data as of 17/10/2026 10:24' },
  typing: { id: 'Mengetik…', en: 'Typing…' },
  thanks: { id: 'Terima kasih atas masukan Anda', en: 'Thanks for your feedback' },
  sugg: [
    { id: 'Kenapa laba bersih naik?', en: 'Why did net profit rise?' },
    { id: 'Beban mana yang tumbuh paling cepat?', en: 'Which expense grew fastest?' },
    { id: 'Bagaimana likuiditas perusahaan?', en: 'How is our liquidity?' },
  ],
}

export function AiPanel({ report, onClose }: { report: string; onClose: () => void }) {
  const { L, isDesktop, showToast } = useShell()
  const t = useT()
  const [msgs, setMsgs] = useState<AiMessage[]>(() => [aiGreeting(report)])
  const [q, setQ] = useState('')
  const ask = useAskAi()
  const scroll = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scroll.current?.scrollTo({ top: scroll.current.scrollHeight, behavior: 'smooth' })
  }, [msgs, ask.isPending])

  const send = (text = q) => {
    const s = text.trim()
    if (!s || ask.isPending) return
    setMsgs((m) => [...m, { id: `u${Date.now()}`, bot: false, t: s, tm: aiNow() }])
    setQ('')
    ask.mutate(s, { onSuccess: (b) => setMsgs((m) => [...m, b]) })
  }

  return (
    <aside
      data-screen-label="AI analysis panel"
      className={cn('flex min-h-0 flex-none animate-[pop_.18s_ease-out] flex-col overflow-hidden rounded-[24px] border border-[rgba(var(--fg),.12)] bg-(--card) shadow-[inset_0_1px_0_rgba(255,255,255,.08)] backdrop-blur-[28px] backdrop-saturate-[180%]', isDesktop ? 'h-full w-[340px]' : 'h-[460px] w-full')}
    >
      <div className="flex flex-none flex-col gap-1.5 border-b border-[rgba(var(--fg),.1)] pt-4 pr-4 pb-3.5 pl-[18px]">
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 text-[15px]">
            <i className="ph-light ph-sparkle text-[18px]" />
            {L.aiTitle}
          </div>
          <span className="flex items-center gap-0.5">
            <Link to="/ai/history" title={L.aiHistory} aria-label={L.aiHistory} className={iconBtn}>
              <i className="ph-light ph-clock-counter-clockwise text-[16px]" />
            </Link>
            <button type="button" title={L.aiClose} aria-label={L.aiClose} className={iconBtn} onClick={onClose}>
              <i className="ph-light ph-x text-[15px]" />
            </button>
          </span>
        </div>
        <div className="flex items-center justify-between gap-2.5 text-[11.5px]">
          <span className="opacity-65">{t(tx.asOf)}</span>
          <button type="button" className="cursor-pointer underline underline-offset-[3px] opacity-85 hover:opacity-100" onClick={() => showToast(t(tx.thanks))}>
            {L.aiFeedback}
          </button>
        </div>
      </div>
      <div ref={scroll} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pt-3.5 pb-4">
        <div className="self-center rounded-[12px] bg-[rgba(var(--fg),.08)] px-3 py-1 text-[11px] opacity-75">{L.aiToday}</div>
        {msgs.map((m) =>
          m.bot ? (
            <div key={m.id} className="max-w-[88%] animate-[fade_.25s] self-start rounded-[18px_18px_18px_6px] border border-[rgba(var(--fg),.1)] bg-[rgba(var(--fg),.09)] px-3.5 pt-3 pb-2.5">
              <div className="flex items-center gap-1.5 text-[11.5px] opacity-70">
                <i className="ph-light ph-sparkle text-[13px]" />
                {L.aiName}
              </div>
              <div className="mt-1.5 text-[13px] leading-normal text-pretty">{m.t}</div>
              <div className="mt-2.5 flex items-center justify-between gap-2.5 text-[10.5px] opacity-55">
                <span className="flex items-center gap-1">
                  <i className="ph-light ph-coins text-[12px]" />
                  {m.cr}
                </span>
                <span>{m.tm}</span>
              </div>
            </div>
          ) : (
            <div key={m.id} className="max-w-[85%] animate-[fade_.2s] self-end rounded-[18px_18px_6px_18px] bg-(--ink) px-3.5 pt-2.5 pb-2 text-(--paper)">
              <div className="text-[13px] leading-normal [overflow-wrap:anywhere]">{m.t}</div>
              <div className="mt-1 text-right text-[10.5px] opacity-60">{m.tm}</div>
            </div>
          ),
        )}
        {msgs.length === 1 && !ask.isPending && (
          <div className="flex flex-wrap gap-1.5">
            {tx.sugg.map((s) => (
              <button key={s.id} type="button" onClick={() => send(t(s))} className="cursor-pointer rounded-[14px] border border-[rgba(var(--fg),.16)] px-3 py-1.5 text-left text-[12px] hover:bg-[rgba(var(--fg),.08)]">
                {t(s)}
              </button>
            ))}
          </div>
        )}
        {ask.isPending && <Typing label={t(tx.typing)} />}
      </div>
      <div className="flex-none border-t border-[rgba(var(--fg),.1)] p-3">
        <div className="flex items-center gap-2 rounded-[22px] border border-[rgba(var(--fg),.14)] bg-[rgba(var(--fg),.08)] py-1 pr-1 pl-3.5">
          <i className="ph-light ph-question flex-none text-[16px] opacity-60" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder={L.aiPh}
            aria-label={L.aiPh}
            className="h-9 min-w-0 flex-1 border-none bg-transparent text-[13px] text-inherit outline-none"
          />
          <button
            type="button"
            title={L.aiSend}
            aria-label={L.aiSend}
            onClick={() => send()}
            className={cn('flex size-9 flex-none cursor-pointer items-center justify-center rounded-full transition-[background] duration-150', q.trim() ? 'bg-(--ink) text-(--paper)' : 'bg-transparent')}
          >
            <i className="ph-light ph-paper-plane-right text-[16px]" />
          </button>
        </div>
      </div>
    </aside>
  )
}

const G = ['236,72,153', '139,92,246', '59,130,246']

/** The design's AI "thinking" bubble: pulsing gradient orb, bouncing dots, shimmering label and a sweeping sheen. */
function Typing({ label }: { label: string }) {
  return (
    <div role="status" className="relative flex flex-none animate-[pop_.25s_ease-out] items-center gap-2.5 self-start overflow-hidden rounded-[18px_18px_18px_6px] border border-[rgba(var(--fg),.1)] bg-[rgba(var(--fg),.09)] py-2 pr-3.5 pl-2">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-2/5 animate-[tsheen_2.2s_ease-in-out_infinite] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,.12),transparent)]" />
      <div className="relative size-[26px] flex-none">
        <div className="absolute inset-0 animate-[torb_1.6s_ease-out_infinite] rounded-full" style={{ background: `rgb(${G[1]})` }} />
        <div className="absolute inset-0 animate-[spin_2.4s_linear_infinite] rounded-full" style={{ background: `conic-gradient(from 0deg,rgb(${G[0]}),rgb(${G[1]}),rgb(${G[2]}),rgb(${G[0]}))`, boxShadow: `0 0 14px rgba(${G[1]},.55)` }} />
        <div className="absolute inset-0 flex items-center justify-center text-[13px] text-white">
          <i className="ph-fill ph-sparkle" />
        </div>
      </div>
      <div className="flex h-3.5 items-center gap-1">
        {G.map((c, i) => (
          <span key={c} className="size-1.5 rounded-full" style={{ background: `rgb(${c})`, boxShadow: `0 0 8px rgba(${c},.7)`, animation: `tdot 1.2s ease-in-out ${i * 0.15}s infinite` }} />
        ))}
      </div>
      <span className="animate-[shim_1.8s_linear_infinite] bg-[linear-gradient(90deg,rgba(var(--fg),.45)_0%,rgba(var(--fg),.45)_40%,rgba(var(--fg),1)_50%,rgba(var(--fg),.45)_60%,rgba(var(--fg),.45)_100%)] bg-size-[200%_100%] bg-clip-text text-[12px] tracking-[.2px] text-transparent">{label}</span>
    </div>
  )
}
