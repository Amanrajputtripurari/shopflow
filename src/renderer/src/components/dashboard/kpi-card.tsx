import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface KpiCardProps {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  icon: LucideIcon
  href?: string
  hrefLabel?: string
  tone?: 'default' | 'positive' | 'negative' | 'warning'
  loading?: boolean
}

const toneStyles = {
  default: 'from-primary/10 to-primary/5 text-primary',
  positive: 'from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400',
  negative: 'from-destructive/15 to-destructive/5 text-destructive',
  warning: 'from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400'
}

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  href,
  hrefLabel,
  tone = 'default',
  loading
}: KpiCardProps) {
  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br',
              toneStyles[tone]
            )}
          >
            <Icon className="size-5" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
              {loading ? '…' : value}
            </p>
            {hint && <div className="mt-1 text-sm text-muted-foreground">{hint}</div>}
            {href && hrefLabel && (
              <Link to={href} className="mt-2 inline-block text-xs text-primary hover:underline">
                {hrefLabel}
              </Link>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
