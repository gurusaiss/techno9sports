"use client"

import * as React from "react"
import { getSessionAction, type SessionInfo } from "@/app/actions/auth"
import { loadBootstrap } from "@/lib/bootstrap"

interface SessionState extends SessionInfo {
  ready: boolean
  refresh: () => Promise<void>
}

const SessionContext = React.createContext<SessionState | null>(null)

export function useSession(): SessionState {
  const ctx = React.useContext(SessionContext)
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>")
  return ctx
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<SessionInfo & { ready: boolean }>({
    signedIn: false,
    firstName: null,
    ready: false,
  })
  const refresh = React.useCallback(async () => {
    const s = await getSessionAction()
    setState({ ...s, ready: true })
  }, [])
  React.useEffect(() => {
    let cancelled = false
    void loadBootstrap().then((b) => {
      if (!cancelled) setState({ ...b.session, ready: true })
    })
    return () => {
      cancelled = true
    }
  }, [])
  const value = React.useMemo(() => ({ ...state, refresh }), [state, refresh])
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
