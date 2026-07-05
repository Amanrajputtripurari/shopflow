import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { OrderStatusBadge, STATUS_LABELS } from '@/components/ui/order-status-badge'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'
import { nextStatuses, type Order, type OrderStatus } from '@shared/types/order'

interface OrderStatusMenuProps {
  order: Pick<Order, 'id' | 'orderNo' | 'type' | 'status'>
}

export function OrderStatusMenu({ order }: OrderStatusMenuProps) {
  const { isAdmin } = useAuth()
  const queryClient = useQueryClient()
  const [cancelOpen, setCancelOpen] = useState(false)

  const nextSteps = nextStatuses(order.type, order.status).filter(
    (status) => status !== 'cancelled' || isAdmin
  )

  const statusMutation = useMutation({
    mutationFn: async (status: OrderStatus) => {
      const result = await window.api.orders.updateStatus(order.id, status)
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
    onSuccess: () => {
      toast.success('Order status updated')
      void queryClient.invalidateQueries({ queryKey: ['orders'] })
      void queryClient.invalidateQueries({ queryKey: ['orders-stats'] })
      void queryClient.invalidateQueries({ queryKey: ['order', order.id] })
      setCancelOpen(false)
    },
    onError: (error: Error) => toast.error(error.message)
  })

  const applyStatus = (status: OrderStatus) => {
    if (status === 'cancelled') {
      setCancelOpen(true)
      return
    }
    void statusMutation.mutateAsync(status)
  }

  if (nextSteps.length === 0) {
    return <OrderStatusBadge status={order.status} />
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto gap-1 px-1.5 py-1"
            disabled={statusMutation.isPending}
          >
            <OrderStatusBadge status={order.status} />
            {statusMutation.isPending ? (
              <Loader2 className="size-3.5 animate-spin opacity-70" />
            ) : (
              <ChevronDown className="size-3.5 opacity-70" />
            )}
            <span className="sr-only">Update status for {order.orderNo}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52">
          <DropdownMenuLabel>Update status</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {nextSteps.map((status) => (
            <DropdownMenuItem
              key={status}
              className={cn(status === 'cancelled' && 'text-destructive focus:text-destructive')}
              onClick={() => applyStatus(status)}
            >
              {STATUS_LABELS[status]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel order {order.orderNo}?</AlertDialogTitle>
            <AlertDialogDescription>
              This order will be marked as cancelled. This action cannot be undone from the list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={statusMutation.isPending}>Keep order</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={statusMutation.isPending}
              onClick={() => void statusMutation.mutateAsync('cancelled')}
            >
              Cancel order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
