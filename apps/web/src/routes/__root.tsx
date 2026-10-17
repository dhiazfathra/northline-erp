import type { QueryClient } from '@tanstack/react-query'
import { Outlet, createRootRouteWithContext, useLocation } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Header } from '@/components/shell/header'
import { MegaMenu, RefreshLoader, SearchDialog, Toast } from '@/components/shell/overlays'
import { TabBar } from '@/components/shell/tab-bar'
import { ShellProvider, useShell } from '@/lib/shell'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
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
  const { openTab, refreshing } = useShell()
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
          <TabBar />
          <RefreshLoader />
          <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto transition-opacity duration-[.45s]" style={{ opacity: refreshing ? 0.55 : 1 }}>
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
