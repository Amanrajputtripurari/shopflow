import { Monitor, Moon, Palette, Sun } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useAppSettings } from '@/hooks/use-app-data'
import { useAppearance } from '@/hooks/use-appearance'
import { cn } from '@/lib/utils'
import { THEME_COLOR_OPTIONS, THEME_MODE_OPTIONS } from '@shared/constants/theme'
import type { ThemeMode } from '@shared/types/settings'

const MODE_ICONS = {
  light: Sun,
  dark: Moon,
  system: Monitor
} as const

export function ThemeMenu() {
  const { settings, refresh } = useAppSettings()
  const { mode, color, saveAppearance } = useAppearance(settings)
  const ModeIcon = MODE_ICONS[mode] ?? Monitor

  const handleSave = async (input: { theme?: ThemeMode; themeColor?: typeof color }) => {
    const result = await saveAppearance(input)
    if (result.ok) {
      await refresh()
    } else {
      toast.error(result.error)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Theme settings">
          <ModeIcon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Sun className="h-4 w-4" />
          Mode
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={mode}
          onValueChange={(value) => void handleSave({ theme: value as ThemeMode })}
        >
          {THEME_MODE_OPTIONS.map(({ value, label }) => (
            <DropdownMenuRadioItem key={value} value={value}>
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="flex items-center gap-2">
          <Palette className="h-4 w-4" />
          Color
        </DropdownMenuLabel>
        <div className="grid grid-cols-3 gap-2 p-2">
          {THEME_COLOR_OPTIONS.map(({ value, label, swatch }) => (
            <button
              key={value}
              type="button"
              title={label}
              aria-label={label}
              aria-pressed={color === value ? 'true' : 'false'}
              onClick={() => void handleSave({ themeColor: value })}
              className={cn(
                'flex h-9 items-center justify-center rounded-md border transition-transform hover:scale-105',
                color === value && 'ring-2 ring-ring ring-offset-2 ring-offset-background'
              )}
            >
              <span
                className="h-5 w-5 rounded-full border border-black/10"
                style={{ backgroundColor: swatch }}
              />
            </button>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
