import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ListPagination } from '@/components/ui/list-pagination'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { useAuth } from '@/hooks/use-auth'
import { usePagination } from '@/hooks/use-pagination'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { WHATSAPP_DELIVERY_QUEUE_DEFAULT_PAGE_SIZE } from '@shared/constants/whatsapp'
import type { QueueDeliveryListResult, QueueMessage, QueueMessageStatus } from '@shared/types/whatsapp'

const STATUS_VARIANT: Record<
  QueueMessageStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  pending: 'outline',
  approved: 'secondary',
  processing: 'secondary',
  sent: 'default',
  failed: 'destructive',
  cancelled: 'outline'
}

function statusLabel(status: QueueMessageStatus): string {
  switch (status) {
    case 'approved':
      return 'queued'
    case 'processing':
      return 'sending'
    default:
      return status
  }
}

export function WhatsAppDeliveryQueueCard() {
  const { isAdmin } = useAuth()
  const queryClient = useQueryClient()
  const { page, pageSize, offset, setPage, setPageSize } = usePagination(
    WHATSAPP_DELIVERY_QUEUE_DEFAULT_PAGE_SIZE
  )

  const deliveryQuery = useQuery({
    queryKey: ['whatsapp-delivery-queue', page, pageSize],
    queryFn: async () => {
      const result = await window.api.whatsapp.queueDeliveryList({ limit: pageSize, offset })
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
    refetchInterval: page === 1 ? 5000 : false,
    placeholderData: keepPreviousData
  })

  const retryMutation = useMutation({
    mutationFn: async (queueId: string) => {
      const result = await window.api.whatsapp.queueRetry(queueId)
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
    onSuccess: () => {
      toast.success('Message queued for retry')
      void queryClient.invalidateQueries({ queryKey: ['whatsapp-delivery-queue'] })
    },
    onError: (error: Error) => toast.error(error.message)
  })

  const data = deliveryQuery.data
  const items = data?.items ?? []
  const isInitialLoad = deliveryQuery.isLoading && !data
  const isRefreshing = deliveryQuery.isFetching && Boolean(data)

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base">Message delivery queue</CardTitle>
          <CardDescription>
            Outbound bills, templates, and approved sends — newest first, paginated by page.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={deliveryQuery.isFetching}
          onClick={() => void deliveryQuery.refetch()}
        >
          {deliveryQuery.isFetching ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          Refresh
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {isInitialLoad ? (
          <StatusSummarySkeleton />
        ) : data ? (
          <StatusSummary counts={data.statusCounts} total={data.total} />
        ) : null}

        <div className="relative rounded-lg border">
          {isRefreshing && (
            <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-center gap-2 border-b bg-background/80 py-2 text-xs text-muted-foreground backdrop-blur-sm">
              <Loader2 className="size-3.5 animate-spin" />
              Updating queue…
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Queued</TableHead>
                {isAdmin ? <TableHead className="text-right">Action</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody className={cn(isRefreshing && 'opacity-60')}>
              {isInitialLoad ? (
                Array.from({ length: pageSize }).map((_, index) => (
                  <TableRow key={`skeleton-${index}`}>
                    <TableCell>
                      <Skeleton className="h-5 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-12" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-40" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-28" />
                    </TableCell>
                    {isAdmin ? (
                      <TableCell className="text-right">
                        <Skeleton className="ml-auto h-8 w-14" />
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isAdmin ? 6 : 5}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    No outbound messages in the delivery queue yet.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <DeliveryRow
                    key={item.id}
                    item={item}
                    isAdmin={isAdmin}
                    retryPending={retryMutation.isPending}
                    onRetry={(queueId) => void retryMutation.mutateAsync(queueId)}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {!isInitialLoad && data && data.total > 0 && (
          <ListPagination
            page={page}
            pageSize={pageSize}
            total={data.total}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[10, 20, 50]}
            className="border-0 pt-0"
          />
        )}

        {page === 1 && !isInitialLoad && (
          <p className="text-xs text-muted-foreground">Page 1 auto-refreshes every 5 seconds.</p>
        )}
      </CardContent>
    </Card>
  )
}

function StatusSummary({
  counts,
  total
}: {
  counts: QueueDeliveryListResult['statusCounts']
  total: number
}) {
  const chips = [
    { label: 'Queued', value: counts.queued, variant: 'secondary' as const },
    { label: 'Sending', value: counts.sending, variant: 'secondary' as const },
    { label: 'Failed', value: counts.failed, variant: 'destructive' as const },
    { label: 'Sent', value: counts.sent, variant: 'default' as const }
  ]

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <Badge key={chip.label} variant={chip.variant} className="gap-1.5 font-normal">
          <span className="font-semibold tabular-nums">{chip.value}</span>
          {chip.label}
        </Badge>
      ))}
      <span className="text-xs text-muted-foreground">{total} total in queue history</span>
    </div>
  )
}

function StatusSummarySkeleton() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-6 w-20 rounded-full" />
      ))}
      <Skeleton className="h-4 w-36" />
    </div>
  )
}

function DeliveryRow({
  item,
  isAdmin,
  retryPending,
  onRetry
}: {
  item: QueueMessage
  isAdmin: boolean
  retryPending: boolean
  onRetry: (queueId: string) => void
}) {
  const customerLabel = item.customerName?.trim() || `+${item.phone}`

  return (
    <TableRow>
      <TableCell>
        <Badge variant={STATUS_VARIANT[item.status]} className="capitalize">
          {statusLabel(item.status)}
        </Badge>
        {item.error ? (
          <p className="mt-1 max-w-[180px] truncate text-xs text-destructive" title={item.error}>
            {item.error}
          </p>
        ) : null}
      </TableCell>
      <TableCell className="capitalize">{item.type}</TableCell>
      <TableCell>
        <div className="max-w-[140px] truncate font-medium" title={customerLabel}>
          {customerLabel}
        </div>
        {item.customerName ? (
          <div className="text-xs text-muted-foreground">+{item.phone}</div>
        ) : null}
      </TableCell>
      <TableCell className="max-w-[220px] truncate" title={item.body}>
        {item.body}
      </TableCell>
      <TableCell className="whitespace-nowrap text-muted-foreground">
        {formatDateTime(item.createdAt)}
      </TableCell>
      {isAdmin ? (
        <TableCell className="text-right">
          {item.status === 'failed' ? (
            <Button size="sm" variant="outline" disabled={retryPending} onClick={() => onRetry(item.id)}>
              {retryPending ? <Loader2 className="size-4 animate-spin" /> : 'Retry'}
            </Button>
          ) : null}
        </TableCell>
      ) : null}
    </TableRow>
  )
}
