import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { OrderStatus } from '@shared/types/order'

const STATUS_LABELS: Record<OrderStatus, string> = {
  draft: 'Draft',
  confirmed: 'Confirmed',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled'
}

const STATUS_STYLES: Record<OrderStatus, string> = {
  draft: 'border-transparent bg-secondary text-secondary-foreground',
  confirmed: 'border-transparent bg-primary text-primary-foreground',
  out_for_delivery: 'border-transparent bg-blue-600 text-white',
  delivered: 'border-transparent bg-emerald-600 text-white',
  cancelled: 'border-transparent bg-destructive text-destructive-foreground'
}

interface OrderStatusBadgeProps {
  status: OrderStatus
  className?: string
}

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  return (
    <Badge variant="outline" className={cn('capitalize', STATUS_STYLES[status], className)}>
      {STATUS_LABELS[status]}
    </Badge>
  )
}

export { STATUS_LABELS }
