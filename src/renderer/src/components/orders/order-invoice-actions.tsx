import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Download, ExternalLink, FileText, Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  canGenerateBillType,
  getOrderInvoices,
  isOrderReadyForBilling,
  type BillType,
  type Order,
  type OrderInvoice
} from '@shared/types/order'

interface OrderInvoiceActionsProps {
  order: Pick<Order, 'id' | 'orderNo' | 'type' | 'status' | 'invoices'>
}

function pdfFileName(invoiceNo: string): string {
  return `${invoiceNo.replaceAll('/', '-')}.pdf`
}

async function downloadInvoice(filePath: string, suggestedName: string) {
  const result = await window.api.billing.download(filePath, suggestedName)
  if (!result.ok) throw new Error(result.error)
  if (result.data) {
    toast.success('Invoice saved')
  }
}

function InvoiceRow({
  invoice,
  disabled,
  onDownload,
  onOpen
}: {
  invoice: OrderInvoice
  disabled?: boolean
  onDownload: () => void
  onOpen: () => void
}) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{invoice.invoiceNo}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{formatDateTime(invoice.billedAt)}</p>
        </div>
        <Badge variant="outline" className="shrink-0 capitalize text-[10px]">
          {invoice.billType}
        </Badge>
      </div>
      <div className="mt-3 flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          className="h-7 flex-1 gap-1 text-xs"
          disabled={disabled}
          onClick={onDownload}
        >
          <Download className="size-3" />
          Download
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 flex-1 gap-1 text-xs"
          disabled={disabled}
          onClick={onOpen}
        >
          <ExternalLink className="size-3" />
          Open
        </Button>
      </div>
    </div>
  )
}

export function OrderInvoiceActions({ order }: OrderInvoiceActionsProps) {
  const queryClient = useQueryClient()
  const invoices = getOrderInvoices(order)
  const canSimple = canGenerateBillType(order, 'simple')
  const canGst = canGenerateBillType(order, 'gst')
  const ready = isOrderReadyForBilling(order)

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['orders'] })
    void queryClient.invalidateQueries({ queryKey: ['order', order.id] })
  }

  const generateMutation = useMutation({
    mutationFn: async (billType: BillType) => {
      const result = await window.api.billing.generate({ orderId: order.id, billType })
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
    onSuccess: async (data) => {
      toast.success(`Invoice generated: ${data.invoiceNo}`)
      invalidate()
      try {
        await downloadInvoice(data.filePath, pdfFileName(data.invoiceNo))
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Download failed')
      }
    },
    onError: (error: Error) => toast.error(error.message)
  })

  const fileMutation = useMutation({
    mutationFn: async ({ action, invoice }: { action: 'download' | 'open'; invoice: OrderInvoice }) => {
      if (action === 'download') {
        await downloadInvoice(invoice.billFilePath, pdfFileName(invoice.invoiceNo))
        return
      }
      const result = await window.api.billing.open(invoice.billFilePath)
      if (!result.ok) throw new Error(result.error)
    },
    onError: (error: Error) => toast.error(error.message)
  })

  const busy = generateMutation.isPending || fileMutation.isPending

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 px-2.5" disabled={busy}>
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <FileText className="size-3.5" />}
          Invoice
          {invoices.length > 0 && (
            <Badge variant="secondary" className="ml-0.5 h-4 px-1 text-[10px] font-normal">
              {invoices.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0" align="end">
        <div className="border-b px-4 py-3">
          <p className="text-sm font-semibold">Invoices</p>
          <p className="text-xs text-muted-foreground">{order.orderNo}</p>
        </div>

        <div className="space-y-3 p-4">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Generated ({invoices.length}/2)
            </p>

            {invoices.length > 0 ? (
              <div className="space-y-2">
                {invoices.map((invoice) => (
                  <InvoiceRow
                    key={`${invoice.billType}-${invoice.invoiceNo}`}
                    invoice={invoice}
                    disabled={busy}
                    onDownload={() =>
                      void fileMutation.mutateAsync({ action: 'download', invoice })
                    }
                    onOpen={() => void fileMutation.mutateAsync({ action: 'open', invoice })}
                  />
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
                No invoice generated yet
              </p>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Generate new
            </p>

            {canSimple || canGst ? (
              <div className="grid gap-2">
                {canSimple && (
                  <Button
                    variant="default"
                    size="sm"
                    className="h-8 w-full justify-start gap-2"
                    disabled={busy}
                    onClick={() => void generateMutation.mutateAsync('simple')}
                  >
                    <Plus className="size-3.5" />
                    Simple bill PDF
                  </Button>
                )}
                {canGst && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-full justify-start gap-2"
                    disabled={busy}
                    onClick={() => void generateMutation.mutateAsync('gst')}
                  >
                    <Plus className="size-3.5" />
                    GST invoice PDF
                  </Button>
                )}
              </div>
            ) : (
              <p
                className={cn(
                  'rounded-lg bg-muted/40 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground',
                  invoices.length > 0 && 'border border-dashed'
                )}
              >
                {!ready
                  ? order.type === 'retail'
                    ? 'Confirm the order before generating an invoice.'
                    : 'Mark the order as delivered before generating an invoice.'
                  : 'Both simple and GST invoices are already generated.'}
              </p>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
