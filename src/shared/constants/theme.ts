import type { ThemeColor, ThemeMode } from '@shared/types/settings'

export const THEME_MODE_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' }
]

export const THEME_COLOR_OPTIONS: { value: ThemeColor; label: string; swatch: string }[] = [
  { value: 'default', label: 'Default', swatch: 'hsl(222.2 47.4% 11.2%)' },
  { value: 'blue', label: 'Blue', swatch: 'hsl(221.2 83.2% 53.3%)' },
  { value: 'green', label: 'Green', swatch: 'hsl(142.1 76.2% 36.3%)' },
  { value: 'violet', label: 'Violet', swatch: 'hsl(262.1 83.3% 57.8%)' },
  { value: 'orange', label: 'Orange', swatch: 'hsl(24.6 95% 53.1%)' },
  { value: 'rose', label: 'Rose', swatch: 'hsl(346.8 77.2% 49.8%)' }
]
