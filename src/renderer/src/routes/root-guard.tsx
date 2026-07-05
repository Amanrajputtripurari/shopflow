import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '@/hooks/use-auth'
import { useAppSettings, useTheme } from '@/hooks/use-app-data'
import { getStoredToken } from '@/viewmodels/auth.store'

export function RootGuard() {
  const location = useLocation()
  const { settings, loading: settingsLoading } = useAppSettings()
  const { user, loading: authLoading } = useAuth()

  useTheme(settings)

  if (settingsLoading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading ShopFlow…</p>
      </div>
    )
  }

  if (!settings?.setupComplete && location.pathname !== '/setup') {
    return <Navigate to="/setup" replace />
  }

  const hasSession = Boolean(user && getStoredToken())

  if (settings?.setupComplete && !hasSession && location.pathname !== '/login') {
    return <Navigate to="/login" replace />
  }

  if (settings?.setupComplete && hasSession && ['/setup', '/login'].includes(location.pathname)) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
