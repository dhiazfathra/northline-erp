import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { currentWorkspaceQuery, invitesQuery, useRespondInvite, useSwitchWorkspace, workspacesQuery } from '@/api/workspaces'
import { Input } from '@/components/ui/input'
import { useShell, useT } from '@/lib/shell'
import { cn } from '@/lib/utils'
import { BareFooter, BareHeader, Monogram, heavyGlass } from './chrome'

const curBadge = 'flex flex-none items-center gap-[5px] rounded-xl bg-(--ink) px-2.5 py-[5px] text-[11px] font-normal text-(--paper)'

/** Tenant picker. `creating` hides the create button while the create modal sits on top. */
export function WorkspaceSwitcher({ creating = false }: { creating?: boolean }) {
  const { L, isMobile, showToast } = useShell()
  const t = useT()
  const navigate = useNavigate()
  const { data: rows = [] } = useQuery(workspacesQuery)
  const { data: invites = [] } = useQuery(invitesQuery)
  const { data: cur } = useQuery(currentWorkspaceQuery)
  const switchWs = useSwitchWorkspace()
  const respond = useRespondInvite()
  const [q, setQ] = useState('')
  const [grid, setGrid] = useState(true)

  const shown = rows.filter((w) => `${w.name} ${w.alias}`.toLowerCase().includes(q.trim().toLowerCase()))
  const pick = (id: string) => {
    if (id === cur?.id) return navigate({ to: '/' })
    switchWs.mutate(id, { onSuccess: () => navigate({ to: '/' }) })
  }
  const op = (id: string) => (switchWs.isPending && switchWs.variables !== id ? 0.45 : 1)
  const views = [
    { v: true, icon: 'ph-squares-four', label: { id: 'Grid', en: 'Grid' } },
    { v: false, icon: 'ph-list', label: { id: 'Daftar', en: 'List' } },
  ]
  const none = <div className="col-span-full px-3.5 py-[22px] text-center text-[13px] opacity-60">{L.wsNone}</div>

  return (
    <div className="flex min-h-0 flex-1 animate-[fade_.25s] flex-col overflow-y-auto">
      <BareHeader onSignOut={() => navigate({ to: '/auth' })} />
      <div className={cn('box-border flex flex-1 justify-center', isMobile ? 'px-4 pt-2 pb-8' : 'px-8 pt-6 pb-14')}>
        <div className="flex w-full max-w-[620px] animate-[pop_.25s_ease-out] flex-col">
          <button
            type="button"
            onClick={() => navigate({ to: '/' })}
            className="flex cursor-pointer items-center gap-2 self-start rounded-2xl border border-[rgba(var(--fg),.12)] bg-[rgba(var(--fg),.08)] py-[7px] pr-3.5 pl-2.5 text-xs hover:bg-[rgba(var(--fg),.16)]"
          >
            <i className="ph-light ph-arrow-left text-sm" />
            {L.wsBackTo} {cur?.name}
          </button>
          <div className={cn('mt-7 leading-[1.05] font-extralight tracking-[-1px]', isMobile ? 'text-[32px]' : 'text-[44px]')}>{L.wsTitle}</div>
          <div className="mt-2.5 text-[13px] opacity-65">{L.wsSub} maya.kerr@harbor.co</div>

          {invites.length > 0 && (
            <>
              <div className="mt-[30px] text-[10.5px] tracking-[.5px] uppercase opacity-55">{L.wsInvites}</div>
              {invites.map((v) => (
                <div key={v.id} className="mt-2.5 flex animate-[fade_.2s] flex-wrap items-center gap-3.5 rounded-[20px] border border-dashed border-[rgba(var(--fg),.28)] bg-[rgba(var(--fg),.06)] px-4 py-3.5">
                  <Monogram name={v.workspace} color="#22c55e" size={42} />
                  <div className="min-w-0 flex-[1_1_180px]">
                    <div className="text-[15px]">{v.workspace}</div>
                    <div className="mt-[3px] text-[11.5px] opacity-60">
                      {L.wsInvitedBy} {v.invitedBy} · {v.role}
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      disabled={respond.isPending}
                      onClick={() => respond.mutate({ id: v.id, accept: true }, { onSuccess: () => showToast(t({ id: `Bergabung ke ${v.workspace}`, en: `Joined ${v.workspace}` })) })}
                      className="cursor-pointer rounded-[18px] bg-(--ink) px-4 py-[9px] text-xs font-normal text-(--paper)"
                    >
                      {L.wsAccept}
                    </button>
                    <button
                      type="button"
                      disabled={respond.isPending}
                      onClick={() => respond.mutate({ id: v.id, accept: false })}
                      className="cursor-pointer rounded-[18px] bg-[rgba(var(--fg),.1)] px-3.5 py-[9px] text-xs hover:bg-[rgba(var(--fg),.18)]"
                    >
                      {L.wsDecline}
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

          <div className={cn('mt-7 flex flex-col rounded-[30px] p-2.5', heavyGlass)}>
            <div className="flex items-center gap-2.5 px-1.5 pt-1.5 pb-2.5">
              <span className="flex min-w-0 flex-1 items-center gap-2.5 rounded-2xl border border-[rgba(var(--fg),.16)] bg-[rgba(var(--fg),.06)] px-3.5">
                <i className="ph-light ph-magnifying-glass text-[15px] opacity-60" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={L.wsSearch}
                  className="h-auto min-w-0 flex-1 rounded-none border-0 bg-transparent px-0 py-3 text-[13.5px] text-(--ink) shadow-none outline-none focus-visible:ring-0 dark:bg-transparent"
                />
              </span>
              {!isMobile && <span className="flex-none text-[11px] opacity-55">{t({ id: `${shown.length} perusahaan`, en: `${shown.length} companies` })}</span>}
              <span className="flex flex-none gap-0.5 rounded-[14px] border border-[rgba(var(--fg),.12)] bg-[rgba(var(--fg),.06)] p-[3px]">
                {views.map((m) => (
                  <button
                    key={m.icon}
                    type="button"
                    title={t(m.label)}
                    aria-label={t(m.label)}
                    onClick={() => setGrid(m.v)}
                    className={cn('flex size-[30px] cursor-pointer items-center justify-center rounded-[11px]', grid === m.v ? 'bg-(--ink) text-(--paper)' : 'text-(--ink)')}
                  >
                    <i className={cn('ph-light text-[15px]', m.icon)} />
                  </button>
                ))}
              </span>
            </div>

            {grid ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-2 px-0.5">
                {shown.map((w) => {
                  const isCur = w.id === cur?.id
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => pick(w.id)}
                      style={{ opacity: op(w.id) }}
                      className={cn(
                        'flex min-w-0 cursor-pointer flex-col gap-3.5 rounded-[22px] border p-4 text-left transition-[background,opacity] duration-150 hover:bg-[rgba(var(--fg),.12)]',
                        isCur ? 'border-[rgba(var(--fg),.3)] bg-[rgba(var(--fg),.1)]' : 'border-[rgba(var(--fg),.1)] bg-[rgba(var(--fg),.04)]',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <Monogram name={w.name} color={w.color} size={46} />
                        {isCur ? (
                          <span className={curBadge}>
                            <i className="ph-light ph-check text-xs" />
                            {L.wsCurrent}
                          </span>
                        ) : (
                          <i className="ph-light ph-arrow-right flex-none text-xs whitespace-nowrap opacity-60" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-[15px]">{w.name}</div>
                        <div className="mt-1 text-[11.5px] opacity-60">{w.role}</div>
                        <div className="mt-0.5 text-[11.5px] opacity-60">{w.type}</div>
                      </div>
                      <div className="h-px bg-[rgba(var(--fg),.1)]" />
                      <span className="text-[11px] opacity-50">{w.lastOpened}</span>
                    </button>
                  )
                })}
                {shown.length === 0 && none}
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {shown.map((w) => {
                  const isCur = w.id === cur?.id
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => pick(w.id)}
                      style={{ opacity: op(w.id) }}
                      className={cn(
                        'flex cursor-pointer items-center gap-3.5 rounded-[20px] border px-3.5 py-3 text-left transition-[background,opacity] duration-150 hover:bg-[rgba(var(--fg),.1)]',
                        isCur ? 'border-[rgba(var(--fg),.2)] bg-[rgba(var(--fg),.08)]' : 'border-transparent bg-transparent',
                      )}
                    >
                      <Monogram name={w.name} color={w.color} size={42} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[15px]">{w.name}</div>
                        <div className="mt-[3px] truncate text-[11.5px] opacity-60">
                          {w.role} · {w.type}
                        </div>
                      </div>
                      {!isMobile && <span className="flex-none text-[11px] whitespace-nowrap opacity-50">{w.lastOpened}</span>}
                      {isCur ? (
                        <span className={curBadge}>
                          <i className="ph-light ph-check text-xs" />
                          {L.wsCurrent}
                        </span>
                      ) : (
                        <i className="ph-light ph-arrow-right min-w-5 flex-none text-right text-xs opacity-60" />
                      )}
                    </button>
                  )
                })}
                {shown.length === 0 && none}
              </div>
            )}
            <div className="mx-1.5 my-2 h-px bg-[rgba(var(--fg),.12)]" />
            {!creating && (
              <div className="flex p-1">
                <button
                  type="button"
                  onClick={() => navigate({ to: '/workspaces/new' })}
                  className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-[18px] bg-[rgba(var(--fg),.08)] p-3 text-[13px] hover:bg-[rgba(var(--fg),.16)]"
                >
                  <i className="ph-light ph-plus text-[15px]" />
                  {L.wsCreate}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <BareFooter />
    </div>
  )
}
