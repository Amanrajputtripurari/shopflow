import { useEffect, useState } from 'react'

import { applyAppearance, subscribeSystemAppearance } from '@/lib/appearance'
import type { AppSettings, DbStatus } from '@shared/types/settings'

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = async () => {
    setLoading(true)
    setError(null)
    const result = await window.api.settings.get()
    if (result.ok) {
      setSettings(result.data)
    } else {
      setError(result.error)
    }
    setLoading(false)
  }

  useEffect(() => {
    void refresh()
    const unsubscribe = window.api.settings.onUpdated(() => {
      void refresh()
    })
    return unsubscribe
  }, [])

  return { settings, loading, error, refresh }
}

export function useDbStatus(pollMs = 30000) {
  const [status, setStatus] = useState<DbStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    const result = await window.api.database.getStatus()
    if (result.ok) {
      setStatus(result.data)
    }
    setLoading(false)
  }

  useEffect(() => {
    void refresh()
    const unsubscribe = window.api.database.onStatusChanged((next) => {
      setStatus(next)
      setLoading(false)
    })

    const interval = window.setInterval(() => {
      void refresh()
    }, pollMs)

    return () => {
      unsubscribe()
      window.clearInterval(interval)
    }
  }, [pollMs])

  return { status, loading, refresh }
}

export function useTheme(settings: AppSettings | null) {
  const theme = settings?.theme ?? 'system'
  const themeColor = settings?.themeColor ?? 'default'

  useEffect(() => {
    applyAppearance(theme, themeColor)

    if (theme !== 'system') {
      return
    }

    return subscribeSystemAppearance(() => {
      applyAppearance('system', themeColor)
    })
  }, [theme, themeColor])
}
