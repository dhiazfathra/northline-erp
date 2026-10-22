import type { QueryClient } from '@tanstack/react-query'
import { Outlet, createRootRouteWithContext, redirect, useLocation } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { signedIn } from '@/api/session'
import { Header } from '@/components/shell/header'
import { MegaMenu, RefreshLoader, SearchDialog, Toast, useRefreshPhase } from '@/components/shell/overlays'
import { TabBar } from '@/components/shell/tab-bar'
import { ShellProvider, useShell } from '@/lib/shell'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  // Every screen except sign-in needs a live session; the API enforces it too, this only stops a signed-out user seeing the shell.
  beforeLoad: async ({ context, location }) => {
    if (!location.pathname.startsWith('/auth') && !(await signedIn(context.queryClient))) throw redirect({ to: '/auth' })
  },
  component: () => (
    <ShellProvider>
      <Root />
    </ShellProvider>
  ),
})

/** Auth and tenant screens are full-bleed; everything else lives inside the tabbed shell. */
const bare = (p: string) => p.startsWith('/auth') || p.startsWith('/workspaces')

function Root() {
  const { pathname } = useLocation()
  const { openTab } = useShell()
  const scroll = useRef<HTMLDivElement>(null)
  const rf = useRefreshPhase(scroll)
  useEffect(() => {
    if (pathname !== '/' && !bare(pathname)) openTab(pathname)
  }, [pathname, openTab])

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden font-light text-(--ink) transition-[background] duration-300 [background:var(--bg-grad)]">
      {bare(pathname) ? (
        <Outlet />
      ) : (
        <>
          <Header />
          <TabBar rfPhase={rf.phase} />
          <RefreshLoader rf={rf} />
          <div
            ref={scroll}
            data-rf={rf.phase === 'in' ? 'in' : undefined}
            className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto transition-opacity duration-[.45s] [&[data-rf=in]_[data-rf-row]]:opacity-0"
            style={{ opacity: rf.phase === 'in' && !rf.bars.length ? 0.35 : 1 }}
          >
            <Outlet />
          </div>
          <MegaMenu />
          <SearchDialog />
        </>
      )}
      <Toast />
    </div>
  )
}
