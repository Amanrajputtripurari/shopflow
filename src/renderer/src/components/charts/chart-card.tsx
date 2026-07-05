import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface ChartCardProps {
  title: string
  description?: string
  children: ReactNode
  className?: string
  loading?: boolean
  action?: ReactNode
}

export function ChartCard({
  title,
  description,
  children,
  className,
  loading,
  action
}: ChartCardProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {action}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" />
            Loading chart…
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}

interface ChartEmptyProps {
  message?: string
}

export function ChartEmpty({ message = 'No data for this period.' }: ChartEmptyProps) {
  return (
    <div className="flex h-[280px] items-center justify-center rounded-lg border border-dashed bg-muted/20 text-sm text-muted-foreground">
      {message}
    </div>
  )
}
