import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import type { AuthUser } from '@shared/types/auth'
import {
  getStoredUser,
  persistSession,
  restoreSession,
  clearSession as clearStoredSession
} from '@/viewmodels/auth.store'

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  isAdmin: boolean
  login: (token: string, user: AuthUser) => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(getStoredUser())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void restoreSession()
      .then((restored) => setUser(restored))
      .finally(() => setLoading(false))
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAdmin: user?.role === 'admin',
      login: (token, nextUser) => {
        persistSession(token, nextUser)
        setUser(nextUser)
      },
      logout: async () => {
        await window.api.auth.logout()
        clearStoredSession()
        setUser(null)
      }
    }),
    [user, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
