import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Download, Loader2, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { NumericInput } from '@/components/ui/numeric-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { formatCurrency, formatDateTime } from '@/lib/format'
import type { BillType, Order, PaymentMode } from '@shared/types/order'
import {
  canGenerateBillType,
  canRecordPayment,
  getOrderInvoices,
  isOrderReadyForBilling
} from '@shared/types/order'

const paymentFormSchema = z.object({
  paidAmount: z.coerce.number().min(0),
  creditAmount: z.coerce.number().min(0),
  paymentMode: z.enum(['cash', 'upi', 'bank', 'mixed'])
})

type PaymentFormValues = z.infer<typeof paymentFormSchema>

interface OrderBillingPanelProps {
  order: Order
}

export function OrderBillingPanel({ order }: OrderBillingPanelProps) {
  const queryClient = useQueryClient()
  const invoices = getOrderInvoices(order)
  const canSimple = canGenerateBillType(order, 'simple')
  const canGst = canGenerateBillType(order, 'gst')
  const ready = isOrderReadyForBilling(order)

  const paymentForm = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      paidAmount: order.totals.grandTotal,
      creditAmount: 0,
      paymentMode: 'cash'
    }
  })

  const billMutation = useMutation({
    mutationFn: async (billType: BillType) => {
      const result = await window.api.billing.generate({ orderId: order.id, billType })
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
    onSuccess: (data) => {
      toast.success(`Bill generated: ${data.invoiceNo}`)
      void queryClient.invalidateQueries({ queryKey: ['order', order.id] })
      void queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
    onError: (error: Error) => toast.error(error.message)
  })

  const paymentMutation = useMutation({
    mutationFn: async (values: PaymentFormValues) => {
      const result = await window.api.ledger.recordPayment({
        orderId: order.id,
        paidAmount: values.paidAmount,
        creditAmount: values.creditAmount,
        paymentMode: values.paymentMode as PaymentMode
      })
      if (!result.ok) throw new Error(result.error)
    },
    onSuccess: () => {
      toast.success('Payment recorded')
      void queryClient.invalidateQueries({ queryKey: ['order', order.id] })
      void queryClient.invalidateQueries({ queryKey: ['orders'] })
      void queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
    onError: (error: Error) => toast.error(error.message)
  })

  const whatsappMutation = useMutation({
    mutationFn: async (billType: BillType) => {
      const result = await window.api.whatsapp.sendBill({ orderId: order.id, billType })
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
    onSuccess: async () => {
      const [session, antiBan] = await Promise.all([
        window.api.whatsapp.sessionStatus(),
        window.api.whatsapp.getAntiBan()
      ])

      if (session.ok && session.data.state !== 'ready') {
        toast.warning('Bill queued — WhatsApp is not connected', {
          description: 'Connect in Settings → WhatsApp → Connections, then check the delivery queue.'
        })
        return
      }

      if (antiBan.ok && antiBan.data.outboundPaused) {
        toast.warning('Bill queued — outbound sending is paused', {
          description: 'Resume sending in Settings → WhatsApp → Settings → Anti-ban.'
        })
        return
      }

      toast.success('Bill queued for WhatsApp delivery', {
        description: 'Track status in Settings → WhatsApp → Delivery queue.'
      })
    },
    onError: (error: Error) => toast.error(error.message)
  })

  const openBill = async (filePath: string) => {
    const result = await window.api.billing.open(filePath)
    if (!result.ok) toast.error(result.error)
  }

  const downloadBill = async (filePath: string, invoiceNo: string) => {
    const fileName = `${invoiceNo.replaceAll('/', '-')}.pdf`
    const result = await window.api.billing.download(filePath, fileName)
    if (!result.ok) toast.error(result.error)
    else if (result.data) toast.success('Invoice saved')
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Billing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={invoices.length > 0 ? 'default' : 'secondary'}>
              {invoices.length > 0 ? `${invoices.length} invoice(s)` : 'Not billed'}
            </Badge>
            <Badge variant="outline">{order.paymentStatus}</Badge>
          </div>

          {invoices.length > 0 && (
            <div className="space-y-3">
              {invoices.map((invoice) => (
                <div key={`${invoice.billType}-${invoice.invoiceNo}`} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{invoice.invoiceNo}</p>
                      <p className="text-xs capitalize text-muted-foreground">
                        {invoice.billType} · {formatDateTime(invoice.billedAt)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void downloadBill(invoice.billFilePath, invoice.invoiceNo)}
                      >
                        <Download className="size-4" />
                        Download
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={whatsappMutation.isPending}
                        onClick={() => void whatsappMutation.mutateAsync(invoice.billType)}
                      >
                        {whatsappMutation.isPending ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <MessageCircle className="size-4" />
                        )}
                        WhatsApp
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void openBill(invoice.billFilePath)}
                      >
                        Open
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              <p className="text-sm text-muted-foreground">
                Paid: {formatCurrency(order.paidAmount)} · Credit: {formatCurrency(order.creditAmount)}
              </p>
            </div>
          )}

          {(canSimple || canGst) && (
            <div className="flex flex-wrap gap-2">
              {canSimple && (
                <Button
                  disabled={billMutation.isPending}
                  onClick={() => void billMutation.mutateAsync('simple')}
                >
                  {billMutation.isPending && <Loader2 className="animate-spin" />}
                  Generate simple bill
                </Button>
              )}
              {canGst && (
                <Button
                  variant="outline"
                  disabled={billMutation.isPending}
                  onClick={() => void billMutation.mutateAsync('gst')}
                >
                  {billMutation.isPending && <Loader2 className="animate-spin" />}
                  Generate GST invoice
                </Button>
              )}
            </div>
          )}

          {!ready && invoices.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Confirm retail orders or mark delivery orders as delivered before billing.
            </p>
          )}

          {ready && !canSimple && !canGst && invoices.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Both simple and GST invoices have been generated for this order.
            </p>
          )}
        </CardContent>
      </Card>

      {canRecordPayment(order) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Record payment</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...paymentForm}>
              <form
                onSubmit={paymentForm.handleSubmit((values) => void paymentMutation.mutateAsync(values))}
                className="grid gap-4 md:grid-cols-2"
              >
                <FormField
                  control={paymentForm.control}
                  name="paidAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Paid now</FormLabel>
                      <FormControl>
                        <NumericInput
                          value={field.value}
                          onNumberChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={paymentForm.control}
                  name="creditAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>On credit (udhaar)</FormLabel>
                      <FormControl>
                        <NumericInput
                          value={field.value}
                          onNumberChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={paymentForm.control}
                  name="paymentMode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment mode</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="upi">UPI</SelectItem>
                          <SelectItem value="bank">Bank</SelectItem>
                          <SelectItem value="mixed">Mixed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex items-end">
                  <Button type="submit" disabled={paymentMutation.isPending}>
                    {paymentMutation.isPending && <Loader2 className="animate-spin" />}
                    Save payment
                  </Button>
                </div>
                <p className="md:col-span-2 text-sm text-muted-foreground">
                  Grand total: {formatCurrency(order.totals.grandTotal)}. Credit requires a linked customer.
                </p>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
