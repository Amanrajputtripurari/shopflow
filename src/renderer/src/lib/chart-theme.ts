/** Read theme CSS variables for Recharts (updates with light/dark + accent color). */
export function chartColor(variable: string, alpha = 1): string {
  if (typeof document === 'undefined') return `hsl(0 0% 50% / ${alpha})`
  const raw = getComputedStyle(document.documentElement).getPropertyValue(variable).trim()
  if (!raw) return `hsl(0 0% 50% / ${alpha})`
  return alpha === 1 ? `hsl(${raw})` : `hsl(${raw} / ${alpha})`
}

export function useChartColors() {
  return {
    primary: chartColor('--primary'),
    primaryMuted: chartColor('--primary', 0.15),
    destructive: chartColor('--destructive'),
    destructiveMuted: chartColor('--destructive', 0.15),
    muted: chartColor('--muted-foreground'),
    border: chartColor('--border'),
    card: chartColor('--card'),
    foreground: chartColor('--foreground'),
    emerald: 'hsl(142 76% 36%)',
    emeraldMuted: 'hsl(142 76% 36% / 0.15)',
    amber: 'hsl(38 92% 50%)',
    blue: 'hsl(217 91% 60%)',
    violet: 'hsl(263 70% 50%)'
  }
}

export function formatChartAxisDate(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(
    new Date(year, month - 1, day)
  )
}

export const ORDER_STATUS_CHART_COLORS: Record<string, string> = {
  draft: 'hsl(215 16% 47%)',
  confirmed: 'hsl(217 91% 60%)',
  out_for_delivery: 'hsl(263 70% 50%)',
  delivered: 'hsl(142 76% 36%)',
  cancelled: 'hsl(0 84% 60%)'
}

export const CATEGORY_CHART_PALETTE = [
  'hsl(var(--primary))',
  'hsl(142 76% 36%)',
  'hsl(38 92% 50%)',
  'hsl(263 70% 50%)',
  'hsl(0 84% 60%)',
  'hsl(199 89% 48%)',
  'hsl(24 95% 53%)',
  'hsl(280 65% 60%)'
]
