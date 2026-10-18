import type { AiConversation } from '@northline/schemas/ai'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { aiConversationsQuery, useDeleteConversation } from '@/api/ai'
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
import { Skeleton } from '@/components/ui/skeleton'
import { DocFrame } from '@/features/asset-modules/doc-header'
import { useShell, useT } from '@/lib/shell'

const TODAY = '2026-10-17'
const YESTERDAY = '2026-10-16'
const card = 'glass-card box-border min-w-0'

function dayName(at: string, lang: 'id' | 'en') {
  const d = at.slice(0, 10)
  if (d === TODAY) return lang === 'id' ? 'Hari ini' : 'Today'
  if (d === YESTERDAY) return lang === 'id' ? 'Kemarin' : 'Yesterday'
  return `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`
}
const when = (c: AiConversation, lang: 'id' | 'en') => (c.at.startsWith(TODAY) ? c.at.slice(11) : `${dayName(c.at, lang)} · ${c.at.slice(11)}`)

export function AiHistory() {
  const { L, lang, isMobile, showToast } = useShell()
  const t = useT()
  const nav = useNavigate()
  const { data, isPending } = useQuery(aiConversationsQuery)
  const del = useDeleteConversation()
  const [q, setQ] = useState('')
  const [selId, setSelId] = useState<string | null>(null)
  const [confirm, setConfirm] = useState(false)

  const groups = useMemo(() => {
    const out: { name: string; items: AiConversation[] }[] = []
    for (const c of data ?? []) {
      if (q && !`${c.title} ${c.report}`.toLowerCase().includes(q.toLowerCase())) continue
      const name = dayName(c.at, lang)
      const g = out.find((x) => x.name === name)
      if (g) g.items.push(c)
      else out.push({ name, items: [c] })
    }
    return out
  }, [data, q, lang])

  // desktop shows the newest by default; mobile starts on the list
  const cur = data?.find((c) => c.id === selId) ?? (isMobile ? undefined : data?.[0])
  const showList = !isMobile || !cur
  const showChat = !isMobile || !!cur
  const h = isMobile ? 'calc(100dvh - 210px)' : 'min(640px,calc(100vh - 230px))'

  return (
    <DocFrame
      mod={t({ id: 'Daftar Laporan', en: 'Reports' })}
      label={t({ id: 'Riwayat AI', en: 'AI History' })}
      subs={[{ name: t({ id: 'Riwayat AI', en: 'AI History' }), to: '/ai/history', active: true }]}
    >
      <div data-screen-label="AI chat history" className="grid animate-[fade_.2s] items-stretch gap-4" style={{ gridTemplateColumns: isMobile ? 'minmax(0,1fr)' : 'minmax(240px,320px) minmax(0,1fr)' }}>
        {showList && (
          <div className={`${card} flex flex-col gap-3 p-[14px]`} style={{ height: h }}>
            <div className="flex h-[38px] flex-none items-center gap-2 rounded-[14px] border border-[rgba(var(--fg),.14)] bg-[rgba(var(--fg),.06)] px-3">
              <i className="ph-light ph-magnifying-glass text-[14px] opacity-60" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={L.aiHxSearch} aria-label={L.aiHxSearch} className="min-w-0 flex-1 border-none bg-transparent p-0 text-[12.5px] text-inherit outline-none" />
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-[14px] overflow-y-auto">
              {isPending && [0, 1, 2].map((i) => <Skeleton key={i} className="h-[58px] w-full rounded-[14px] bg-[rgba(var(--fg),.08)]" />)}
              {groups.map((g) => (
                <div key={g.name} className="flex flex-col gap-0.5">
                  <div className="px-3 pb-1.5 text-[10.5px] tracking-[.5px] uppercase opacity-50">{g.name}</div>
                  {g.items.map((x) => (
                    <button
                      type="button"
                      key={x.id}
                      onClick={() => setSelId(x.id)}
                      className="flex cursor-pointer flex-col gap-[5px] rounded-[14px] px-3 py-[11px] text-left text-(--ink) hover:bg-[rgba(var(--fg),.08)]"
                      style={{ background: x.id === cur?.id ? 'rgba(var(--fg),.1)' : undefined }}
                    >
                      <div className="flex w-full items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-[13px]">{x.title}</span>
                        <span className="flex-none text-[10.5px] tabular-nums opacity-50">{x.at.slice(11)}</span>
                      </div>
                      <div className="flex w-full min-w-0 items-center gap-1.5 text-[11px] opacity-60">
                        <i className="ph-light ph-file-text flex-none text-[12px]" />
                        <span className="min-w-0 flex-1 truncate">{x.report}</span>
                        <span className="flex-none">{x.messages.length}</span>
                      </div>
                    </button>
                  ))}
                </div>
              ))}
              {!isPending && groups.length === 0 && <div className="px-2.5 py-7 text-center text-[12.5px] opacity-50">{data?.length ? L.aiHxNone : L.aiHxEmpty}</div>}
            </div>
          </div>
        )}
        {showChat && (
          <div className={`${card} flex flex-col overflow-hidden`} style={{ height: h }}>
            {cur ? (
              <>
                <div className="flex flex-none flex-wrap items-start justify-between gap-3 border-b border-[rgba(var(--fg),.1)] px-5 pt-4 pb-[14px]">
                  <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-[5px]">
                    {isMobile && (
                      <button type="button" onClick={() => setSelId(null)} className="mb-1 flex cursor-pointer items-center gap-1.5 self-start text-[12px] text-(--ink) opacity-70">
                        <i className="ph-light ph-arrow-left text-[13px]" />
                        {L.aiHxBack}
                      </button>
                    )}
                    <span className="flex min-w-0 items-center gap-1.5 text-[11px] opacity-60">
                      <i className="ph-light ph-file-text flex-none text-[12px]" />
                      <span className="truncate">{cur.report}</span>
                    </span>
                    <span className="text-[17px] leading-[1.3] text-pretty">{cur.title}</span>
                    <span className="text-[11.5px] opacity-55">{when(cur, lang)}</span>
                  </div>
                  <div className="flex flex-none items-center gap-2">
                    <button
                      type="button"
                      title={L.aiHxDel}
                      aria-label={L.aiHxDel}
                      onClick={() => setConfirm(true)}
                      className="box-border flex size-[34px] cursor-pointer items-center justify-center rounded-full border border-[rgba(var(--fg),.18)] text-(--ink) hover:bg-[rgba(239,68,68,.14)] hover:text-[#ef4444]"
                    >
                      <i className="ph-light ph-trash text-[15px]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => nav({ href: `/reports/${cur.reportId}?ai=1` })}
                      className="flex h-[34px] cursor-pointer items-center gap-2 rounded-[17px] bg-(--ink) px-4 text-[12px] text-(--paper) hover:opacity-[.88]"
                    >
                      <i className="ph-light ph-sparkle text-[14px]" />
                      {L.aiHxCont}
                    </button>
                  </div>
                </div>
                <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 pt-[18px] pb-[22px]">
                  {cur.messages.map((m, i) =>
                    m.bot ? (
                      <div key={i} className="max-w-[min(88%,560px)] self-start rounded-[18px_18px_18px_6px] border border-[rgba(var(--fg),.1)] bg-[rgba(var(--fg),.09)] px-[14px] pt-3 pb-2.5">
                        <div className="flex items-center gap-1.5 text-[11.5px] opacity-70">
                          <i className="ph-light ph-sparkle text-[13px]" />
                          {L.aiName}
                        </div>
                        <div className="mt-1.5 text-[13px] leading-normal text-pretty">{m.text}</div>
                        <div className="mt-2.5 flex items-center justify-between gap-2.5 text-[10.5px] opacity-55">
                          <span className="flex items-center gap-1">
                            <i className="ph-light ph-coins text-[12px]" />
                            {m.credits} {t({ id: 'kredit', en: 'credits' })}
                          </span>
                          <span>{m.time}</span>
                        </div>
                      </div>
                    ) : (
                      <div key={i} className="max-w-[min(85%,520px)] self-end rounded-[18px_18px_6px_18px] bg-(--ink) px-[14px] pt-2.5 pb-2 text-(--paper)">
                        <div className="text-[13px] leading-normal wrap-anywhere">{m.text}</div>
                        <div className="mt-1 text-right text-[10.5px] opacity-60">{m.time}</div>
                      </div>
                    ),
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-2.5 px-5 py-10 text-center">
                <i className="ph-light ph-chats-circle text-[34px] opacity-50" />
                <span className="text-[13px] opacity-60">{L.aiHxEmpty}</span>
              </div>
            )}
          </div>
        )}
      </div>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent className="glass-pop font-light rounded-3xl text-(--ink)">
          <AlertDialogHeader>
            <AlertDialogTitle>{t({ id: 'Hapus percakapan?', en: 'Delete conversation?' })}</AlertDialogTitle>
            <AlertDialogDescription className="text-(--ink) opacity-70">
              {t({ id: 'Percakapan ini akan dihapus permanen.', en: 'This conversation will be permanently deleted.' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="bg-transparent">
            <AlertDialogCancel className="rounded-2xl">{t({ id: 'Batal', en: 'Cancel' })}</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-2xl bg-[#ef4444] text-white hover:bg-[#dc2626]"
              onClick={() =>
                cur &&
                del.mutate(cur.id, {
                  onSuccess: () => {
                    setSelId(null)
                    showToast(t({ id: 'Percakapan dihapus', en: 'Conversation deleted' }))
                  },
                })
              }
            >
              {L.aiHxDel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DocFrame>
  )
}
