import { Monitor, Moon, Sun } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useAppearance } from '@/hooks/use-appearance'
import { cn } from '@/lib/utils'
import { THEME_COLOR_OPTIONS, THEME_MODE_OPTIONS } from '@shared/constants/theme'
import type { AppSettings } from '@shared/types/settings'

const MODE_ICONS = {
  light: Sun,
  dark: Moon,
  system: Monitor
} as const

interface AppearanceSettingsProps {
  settings: AppSettings | null
  saving?: boolean
  onRefresh: () => Promise<void>
}

export function AppearanceSettings({ settings, saving = false, onRefresh }: AppearanceSettingsProps) {
  const { mode, color, saveAppearance } = useAppearance(settings)

  const handleSave = async (input: Parameters<typeof saveAppearance>[0]) => {
    const result = await saveAppearance(input)
    if (result.ok) {
      toast.success('Appearance updated')
      await onRefresh()
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label>Mode</Label>
        <div className="flex flex-wrap gap-2">
          {THEME_MODE_OPTIONS.map(({ value, label }) => {
            const Icon = MODE_ICONS[value]
            return (
              <Button
                key={value}
                variant={mode === value ? 'default' : 'outline'}
                size="sm"
                disabled={saving}
                onClick={() => void handleSave({ theme: value })}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Button>
            )
          })}
        </div>
      </div>

      <div className="space-y-3">
        <Label>Theme color</Label>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {THEME_COLOR_OPTIONS.map(({ value, label, swatch }) => (
            <button
              key={value}
              type="button"
              disabled={saving}
              onClick={() => void handleSave({ themeColor: value })}
              className={cn(
                'flex flex-col items-center gap-2 rounded-lg border p-3 transition-colors hover:bg-accent/50 disabled:opacity-50',
                color === value && 'border-primary ring-2 ring-ring ring-offset-2 ring-offset-background'
              )}
            >
              <span
                className="h-8 w-8 rounded-full border border-black/10 shadow-sm"
                style={{ backgroundColor: swatch }}
              />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
