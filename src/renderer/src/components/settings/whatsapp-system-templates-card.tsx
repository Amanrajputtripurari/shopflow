import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/use-auth'

const TEMPLATE_FIELDS = [
  {
    key: 'order_confirm',
    label: 'Order confirmed',
    description: 'Sent when order is created (if enabled) or status becomes confirmed.',
    variables: ['customerName', 'orderNo', 'amount', 'shopName', 'status']
  },
  {
    key: 'delivery_update',
    label: 'Delivery update',
    description: 'Sent when delivery status changes to out for delivery or delivered.',
    variables: ['customerName', 'orderNo', 'status', 'amount', 'shopName']
  },
  {
    key: 'credit_reminder',
    label: 'Credit reminder',
    description: 'Used for manual credit reminders — requires admin approval before send.',
    variables: ['customerName', 'shopName', 'creditBalance']
  },
  {
    key: 'order_with_invoice',
    label: 'Order with invoice',
    description: 'Sent with PDF when invoice is generated (if auto-send is enabled).',
    variables: ['customerName', 'orderNo', 'invoiceNo', 'amount', 'shopName', 'status']
  }
] as const

const templatesFormSchema = z.object({
  autoSendOrderOnCreate: z.boolean(),
  autoSendOrderConfirmOnStatus: z.boolean(),
  autoSendDeliveryUpdate: z.boolean(),
  autoSendInvoiceOnBillGenerate: z.boolean(),
  templates: z.object({
    order_confirm: z.string().min(1, 'Template is required'),
    delivery_update: z.string().min(1, 'Template is required'),
    credit_reminder: z.string().min(1, 'Template is required'),
    order_with_invoice: z.string().min(1, 'Template is required')
  })
})

type TemplatesFormValues = z.infer<typeof templatesFormSchema>

export function WhatsAppSystemTemplatesCard() {
  const { isAdmin } = useAuth()
  const queryClient = useQueryClient()

  const form = useForm<TemplatesFormValues>({
    resolver: zodResolver(templatesFormSchema),
    defaultValues: {
      autoSendOrderOnCreate: false,
      autoSendOrderConfirmOnStatus: true,
      autoSendDeliveryUpdate: true,
      autoSendInvoiceOnBillGenerate: false,
      templates: {
        order_confirm: '',
        delivery_update: '',
        credit_reminder: '',
        order_with_invoice: ''
      }
    }
  })

  const configQuery = useQuery({
    queryKey: ['whatsapp-messaging'],
    enabled: isAdmin,
    queryFn: async () => {
      const result = await window.api.whatsapp.getMessaging()
      if (!result.ok) throw new Error(result.error)
      return result.data
    }
  })

  useEffect(() => {
    if (!configQuery.data) return
    form.reset({
      autoSendOrderOnCreate: configQuery.data.autoSendOrderOnCreate,
      autoSendOrderConfirmOnStatus: configQuery.data.autoSendOrderConfirmOnStatus,
      autoSendDeliveryUpdate: configQuery.data.autoSendDeliveryUpdate,
      autoSendInvoiceOnBillGenerate: configQuery.data.autoSendInvoiceOnBillGenerate,
      templates: { ...configQuery.data.templates }
    })
  }, [configQuery.data, form])

  const saveMutation = useMutation({
    mutationFn: async (values: TemplatesFormValues) => {
      const result = await window.api.whatsapp.saveMessaging(values)
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
    onSuccess: (data) => {
      toast.success('Templates and auto-send settings saved')
      form.reset({
        autoSendOrderOnCreate: data.autoSendOrderOnCreate,
        autoSendOrderConfirmOnStatus: data.autoSendOrderConfirmOnStatus,
        autoSendDeliveryUpdate: data.autoSendDeliveryUpdate,
        autoSendInvoiceOnBillGenerate: data.autoSendInvoiceOnBillGenerate,
        templates: { ...data.templates }
      })
      void queryClient.invalidateQueries({ queryKey: ['whatsapp-messaging'] })
    },
    onError: (error: Error) => toast.error(error.message)
  })

  if (!isAdmin) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">System templates</CardTitle>
        <CardDescription>
          Edit message templates and choose when WhatsApp messages are queued automatically.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {configQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading templates…</p>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((values) => void saveMutation.mutateAsync(values))}
              className="space-y-6"
            >
              <div className="space-y-3 rounded-lg border p-4">
                <p className="text-sm font-medium">Automatic sends</p>
                <FormField
                  control={form.control}
                  name="autoSendOrderOnCreate"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between gap-4">
                      <div className="space-y-0.5">
                        <FormLabel>Send on order create</FormLabel>
                        <FormDescription>
                          Queue order confirmed template when a new order is saved.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="autoSendOrderConfirmOnStatus"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between gap-4">
                      <div className="space-y-0.5">
                        <FormLabel>Send on retail order confirmed</FormLabel>
                        <FormDescription>
                          Queue message when retail order status changes to confirmed.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="autoSendDeliveryUpdate"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between gap-4">
                      <div className="space-y-0.5">
                        <FormLabel>Send delivery updates</FormLabel>
                        <FormDescription>
                          Queue message on out for delivery or delivered status.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="autoSendInvoiceOnBillGenerate"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between gap-4">
                      <div className="space-y-0.5">
                        <FormLabel>Send invoice on bill generate</FormLabel>
                        <FormDescription>
                          Generates a simple invoice, then queues the order with invoice template and PDF.
                          Requires a customer with a valid phone and WhatsApp connected. Retail orders are
                          auto-confirmed for billing.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                {TEMPLATE_FIELDS.map((template) => (
                  <div key={template.key} className="rounded-lg border bg-muted/20 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{template.label}</p>
                        <p className="text-xs text-muted-foreground">{template.description}</p>
                      </div>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {template.key}
                      </Badge>
                    </div>
                    <FormField
                      control={form.control}
                      name={`templates.${template.key}`}
                      render={({ field }) => (
                        <FormItem className="mt-3">
                          <FormControl>
                            <Textarea {...field} rows={3} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {template.variables.map((variable) => (
                        <Badge key={variable} variant="secondary" className="font-mono text-[10px]">
                          {`{${variable}}`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="animate-spin" />}
                Save templates
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  )
}
