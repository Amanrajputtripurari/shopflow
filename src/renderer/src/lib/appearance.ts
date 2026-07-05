import type { ThemeColor, ThemeMode } from '@shared/types/settings'

function resolveMode(theme: ThemeMode): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  return theme
}

export function applyAppearance(theme: ThemeMode, themeColor: ThemeColor): void {
  const root = document.documentElement
  const mode = resolveMode(theme)

  root.classList.remove('light')
  root.classList.toggle('dark', mode === 'dark')
  root.dataset.themeMode = mode
  root.style.colorScheme = mode

  if (themeColor === 'default') {
    root.removeAttribute('data-theme-color')
  } else {
    root.dataset.themeColor = themeColor
  }
}

export function subscribeSystemAppearance(onChange: () => void): () => void {
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}
