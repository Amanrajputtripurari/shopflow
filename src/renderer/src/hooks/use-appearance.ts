import { useEffect, useState } from 'react'

import { applyAppearance } from '@/lib/appearance'
import type { AppSettings, ThemeColor, ThemeMode } from '@shared/types/settings'

export function useAppearance(settings: AppSettings | null) {
  const [mode, setMode] = useState<ThemeMode>(settings?.theme ?? 'system')
  const [color, setColor] = useState<ThemeColor>(settings?.themeColor ?? 'default')

  useEffect(() => {
    if (!settings) return
    setMode(settings.theme ?? 'system')
    setColor(settings.themeColor ?? 'default')
  }, [settings?.theme, settings?.themeColor, settings])

  const saveAppearance = async (input: { theme?: ThemeMode; themeColor?: ThemeColor }) => {
    const previousMode = mode
    const previousColor = color
    const nextMode = input.theme ?? mode
    const nextColor = input.themeColor ?? color

    setMode(nextMode)
    setColor(nextColor)
    applyAppearance(nextMode, nextColor)

    const result = await window.api.settings.save({
      theme: nextMode,
      themeColor: nextColor
    })

    if (!result.ok) {
      setMode(previousMode)
      setColor(previousColor)
      applyAppearance(previousMode, previousColor)
    }

    return result
  }

  return { mode, color, saveAppearance }
}
