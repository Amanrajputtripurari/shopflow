import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ClipboardList,
  MapPin,
  Package,
  Plus,
  Search,
  ShoppingBag,
  Truck,
  X
} from 'lucide-react'

import { PageHeader } from '@/components/layout/page-header'
import { OrderInvoiceActions } from '@/components/orders/order-invoice-actions'
import { OrderStatusMenu } from '@/components/orders/order-status-menu'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { ListPagination } from '@/components/ui/list-pagination'
import { STATUS_LABELS } from '@/components/ui/order-status-badge'
import { PaymentStatusBadge } from '@/components/ui/payment-status-badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { TableSkeleton } from '@/components/ui/table-skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { usePagination, useResetPagination } from '@/hooks/use-pagination'
import { formatCurrency, formatDateTime, formatRelativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  getOrderDisplayAddress,
  getOrderExtraCharges,
  getOrderInvoices,
  getOrderItemQty,
  getOrderLineCount,
  type Order,
  type OrderStatus,
  type OrderType
} from '@shared/types/order'

const STATUS_TABS: { id: OrderStatus | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: STATUS_LABELS.draft },
  { id: 'confirmed', label: STATUS_LABELS.confirmed },
  { id: 'out_for_delivery', label: STATUS_LABELS.out_for_delivery },
  { id: 'delivered', label: STATUS_LABELS.delivered },
  { id: 'cancelled', label: STATUS_LABELS.cancelled }
]

function TypeIcon({ type }: { type: OrderType }) {
  const Icon = type === 'delivery' ? Truck : ShoppingBag
  return (
    <div
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-lg border',
        type === 'delivery'
          ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300'
          : 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-300'
      )}
    >
      <Icon className="size-4" />
    </div>
  )
}

function OrderListRow({ order }: { order: Order }) {
  const address = getOrderDisplayAddress(order)
  const extraCharges = getOrderExtraCharges(order)
  const lineCount = getOrderLineCount(order)
  const itemQty = getOrderItemQty(order)
  const invoices = getOrderInvoices(order)

  return (
    <TableRow className="group">
      <TableCell>
        <div className="flex items-start gap-3">
          <TypeIcon type={order.type} />
          <div className="min-w-0 space-y-1">
            <Link
              to={`/orders/${order.id}`}
              className="font-semibold text-primary hover:underline"
            >
              {order.orderNo}
            </Link>
            <p className="text-xs text-muted-foreground">
              {lineCount} line{lineCount === 1 ? '' : 's'} · {itemQty} item{itemQty === 1 ? '' : 's'}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell className="max-w-[240px]">
        <p className="font-medium leading-tight">{order.customerName}</p>
        {address ? (
          <p className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
            <MapPin className="mt-0.5 size-3 shrink-0 opacity-70" />
            <span className="line-clamp-2">{address}</span>
          </p>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">No address</p>
        )}
      </TableCell>
      <TableCell>
        <OrderStatusMenu order={order} />
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {extraCharges > 0 ? (
          <span className="text-sm font-medium">{formatCurrency(extraCharges)}</span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <OrderInvoiceActions order={order} />
          {invoices.length > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] tabular-nums">
              {invoices.length}
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <PaymentStatusBadge status={order.paymentStatus} />
      </TableCell>
      <TableCell className="text-right">
        <p className="font-semibold tabular-nums">{formatCurrency(order.totals.grandTotal)}</p>
        {order.paymentStatus === 'partial' && order.paidAmount > 0 && (
          <p className="text-xs text-muted-foreground tabular-nums">
            Paid {formatCurrency(order.paidAmount)}
          </p>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-default text-sm">{formatRelativeTime(order.createdAt)}</span>
          </TooltipTrigger>
          <TooltipContent>{formatDateTime(order.createdAt)}</TooltipContent>
        </Tooltip>
      </TableCell>
      <TableCell className="text-right">
        <Button
          variant="ghost"
          size="sm"
          className="opacity-0 transition-opacity group-hover:opacity-100"
          asChild
        >
          <Link to={`/orders/${order.id}`}>View</Link>
        </Button>
      </TableCell>
    </TableRow>
  )
}

export function OrdersPage() {
  const [searchInput, setSearchInput] = useState('')
  const [status, setStatus] = useState<OrderStatus | 'all'>('all')
  const search = useDebouncedValue(searchInput, 300)
  const { page, pageSize, offset, setPage, setPageSize, resetPage } = usePagination()

  useResetPagination(resetPage, [search, status])

  const statsFilters = useMemo(
    () => ({
      search: search || undefined,
      type: 'all' as const,
      status: 'all' as const
    }),
    [search]
  )

  const ordersQuery = useQuery({
    queryKey: ['orders', search, status, page, pageSize],
    queryFn: async () => {
      const result = await window.api.orders.list({
        search: search || undefined,
        type: 'all',
        status,
        limit: pageSize,
        offset
      })
      if (!result.ok) throw new Error(result.error)
      return result.data
    }
  })

  const statsQuery = useQuery({
    queryKey: ['orders-stats', search],
    queryFn: async () => {
      const result = await window.api.orders.listStats(statsFilters)
      if (!result.ok) throw new Error(result.error)
      return result.data
    }
  })

  const orders = ordersQuery.data?.items ?? []
  const totalOrders = ordersQuery.data?.total ?? 0
  const stats = statsQuery.data ?? {
    all: 0,
    draft: 0,
    confirmed: 0,
    out_for_delivery: 0,
    delivered: 0,
    cancelled: 0,
    retail: 0,
    delivery: 0
  }

  const statusCount = (tab: OrderStatus | 'all') => {
    if (tab === 'all') return stats.all
    return stats[tab]
  }

  const viewSummary = useMemo(() => {
    const totalValue = orders.reduce((sum, order) => sum + order.totals.grandTotal, 0)
    const unpaidCount = orders.filter((order) => order.paymentStatus === 'unpaid').length
    return { totalValue, unpaidCount }
  }, [orders])

  const hasActiveFilters = status !== 'all' || searchInput.length > 0

  const clearFilters = () => {
    setSearchInput('')
    setStatus('all')
  }

  const summaryCards = [
    {
      label: 'All orders',
      value: stats.all,
      sub: 'Matching search',
      icon: ClipboardList
    },
    {
      label: 'Retail',
      value: stats.retail,
      sub: 'Counter orders',
      icon: ShoppingBag
    },
    {
      label: 'Delivery',
      value: stats.delivery,
      sub: 'Home delivery',
      icon: Truck
    },
    {
      label: 'View total',
      value: formatCurrency(viewSummary.totalValue),
      sub: `${totalOrders} orders · page total ${formatCurrency(viewSummary.totalValue)}`,
      icon: Package,
      isCurrency: true
    }
  ]

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-6">
        <PageHeader
          title="Orders"
          description="Track retail counter and delivery orders in one place."
          actions={
            <Button asChild>
              <Link to="/orders/new">
                <Plus className="size-4" />
                Quick order
              </Link>
            </Button>
          }
        />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => {
            const Icon = card.icon
            return (
              <Card key={card.label}>
                <CardContent className="flex items-start gap-3 p-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
                    <Icon className="size-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {card.label}
                    </p>
                    <p
                      className={cn(
                        'truncate font-semibold tabular-nums',
                        card.isCurrency ? 'text-xl' : 'text-2xl'
                      )}
                    >
                      {statsQuery.isLoading && !card.isCurrency ? '…' : card.value}
                    </p>
                    <p className="text-xs text-muted-foreground">{card.sub}</p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <Card>
          <CardHeader className="space-y-4 pb-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">Order feed</CardTitle>
                <CardDescription>
                  {ordersQuery.isLoading
                    ? 'Loading orders…'
                    : `Showing ${orders.length} of ${totalOrders} ${status === 'all' ? 'orders' : STATUS_LABELS[status].toLowerCase() + ' orders'}`}
                  {viewSummary.unpaidCount > 0 && ` · ${viewSummary.unpaidCount} unpaid`}
                </CardDescription>
              </div>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  <X className="size-3.5" />
                  Clear filters
                </Button>
              )}
            </div>

            <nav className="-mb-px flex gap-0 overflow-x-auto border-b">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatus(tab.id)}
                  className={cn(
                    'relative shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                    status === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground'
                  )}
                >
                  {tab.label}
                  <span
                    className={cn(
                      'ml-1.5 tabular-nums text-xs',
                      status === tab.id ? 'text-primary/80' : 'text-muted-foreground'
                    )}
                  >
                    ({statsQuery.isLoading ? '…' : statusCount(tab.id)})
                  </span>
                </button>
              ))}
            </nav>
          </CardHeader>

          <CardContent className="space-y-4 pt-4">
            <div className="relative min-w-0">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search order no, customer, address…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9"
              />
            </div>

            {ordersQuery.isError ? (
              <EmptyState
                icon={ClipboardList}
                title="Could not load orders"
                description={
                  ordersQuery.error instanceof Error
                    ? ordersQuery.error.message
                    : 'Something went wrong. Try again.'
                }
                action={
                  <Button variant="outline" onClick={() => void ordersQuery.refetch()}>
                    Retry
                  </Button>
                }
              />
            ) : ordersQuery.isLoading ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Extra</TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-[72px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableSkeleton columns={9} />
                  </TableBody>
                </Table>
              </div>
            ) : orders.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title={hasActiveFilters ? 'No orders match filters' : 'No orders yet'}
                description={
                  hasActiveFilters
                    ? 'Try clearing filters or broadening your search.'
                    : 'Create your first order to get started.'
                }
                action={
                  hasActiveFilters ? (
                    <Button variant="outline" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  ) : (
                    <Button asChild>
                      <Link to="/orders/new">
                        <Plus className="size-4" />
                        Quick order
                      </Link>
                    </Button>
                  )
                }
              />
            ) : (
              <div className="overflow-hidden rounded-md border">
                <div className="max-h-[min(68vh,720px)] overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-background shadow-sm">
                      <TableRow>
                        <TableHead className="min-w-[160px]">Order</TableHead>
                        <TableHead className="min-w-[200px]">Customer</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Extra</TableHead>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="w-[72px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => (
                        <OrderListRow key={order.id} order={order} />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <ListPagination
              page={page}
              pageSize={pageSize}
              total={totalOrders}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  )
}
