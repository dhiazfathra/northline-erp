import { useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { dicts, type Dict, type Lang } from './i18n'

export type Mode = 'dark' | 'light'

interface Shell {
  mode: Mode
  setMode: (m: Mode) => void
  lang: Lang
  setLang: (l: Lang) => void
  L: Dict
  isMobile: boolean
  isDesktop: boolean
  tabs: string[]
  openTab: (path: string) => void
  removeTab: (path: string) => void
  setTabs: (paths: string[]) => void
  dirty: Set<string>
  setDirty: (path: string, dirty: boolean) => void
  megaOpen: boolean
  setMegaOpen: (o: boolean) => void
  searchOpen: boolean
  setSearchOpen: (o: boolean) => void
  toast: string | null
  showToast: (msg: string) => void
  refreshing: boolean
  refresh: () => void
}

const Ctx = createContext<Shell | null>(null)

function read<T extends string>(key: string, fallback: T): T {
  try {
    return (localStorage.getItem(key) as T) || fallback
  } catch {
    return fallback
  }
}

function useWidth() {
  const [w, setW] = useState(() => window.innerWidth)
  useEffect(() => {
    const on = () => setW(window.innerWidth)
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return w
}

export function ShellProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const [mode, setModeState] = useState<Mode>(() => read('nl-mode', 'dark'))
  const [lang, setLangState] = useState<Lang>(() => read('nl-lang', 'id'))
  const [tabs, setTabs] = useState<string[]>([])
  const [dirty, setDirtySet] = useState<Set<string>>(new Set())
  const [megaOpen, setMegaOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const width = useWidth()

  useEffect(() => {
    document.documentElement.dataset.mode = mode
    try {
      localStorage.setItem('nl-mode', mode)
    } catch {
      /* storage unavailable: preference lives for this session only */
    }
  }, [mode])
  useEffect(() => {
    document.documentElement.lang = lang
    try {
      localStorage.setItem('nl-lang', lang)
    } catch {
      /* storage unavailable */
    }
  }, [lang])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(t)
  }, [toast])

  const openTab = useCallback((path: string) => setTabs((t) => (t.includes(path) ? t : [...t, path])), [])
  const removeTab = useCallback((path: string) => {
    setTabs((t) => t.filter((p) => p !== path))
    setDirtySet((d) => {
      const n = new Set(d)
      n.delete(path)
      return n
    })
  }, [])
  const setDirty = useCallback((path: string, on: boolean) => {
    setDirtySet((d) => {
      if (d.has(path) === on) return d
      const n = new Set(d)
      if (on) n.add(path)
      else n.delete(path)
      return n
    })
  }, [])

  const refresh = useCallback(() => {
    if (refreshing) return
    setRefreshing(true)
    void qc.invalidateQueries()
    setTimeout(() => setRefreshing(false), 900)
  }, [qc, refreshing])

  const value = useMemo<Shell>(
    () => ({
      mode,
      setMode: setModeState,
      lang,
      setLang: setLangState,
      L: dicts[lang],
      isMobile: width < 720,
      isDesktop: width >= 1180,
      tabs,
      openTab,
      removeTab,
      setTabs,
      dirty,
      setDirty,
      megaOpen,
      setMegaOpen,
      searchOpen,
      setSearchOpen,
      toast,
      showToast: setToast,
      refreshing,
      refresh,
    }),
    [mode, lang, width, tabs, openTab, removeTab, dirty, setDirty, megaOpen, searchOpen, toast, refreshing, refresh],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useShell() {
  const s = useContext(Ctx)
  if (!s) throw new Error('useShell outside ShellProvider')
  return s
}

/** Localised pick for `{ id, en }` records. */
export function useT() {
  const { lang } = useShell()
  return (t: Record<Lang, string>) => t[lang]
}
