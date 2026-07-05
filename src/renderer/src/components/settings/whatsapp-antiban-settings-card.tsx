import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'

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
import { NumericInput } from '@/components/ui/numeric-input'
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/hooks/use-auth'

const antiBanFormSchema = z.object({
  outboundPaused: z.boolean(),
  maxPerMinute: z.coerce.number().min(1, 'Must be at least 1'),
  maxPerHour: z.coerce.number().min(1, 'Must be at least 1'),
  minGapSameCustomerMs: z.coerce.number().min(0),
  pauseOnFailureRate: z.coerce.number().min(0).max(1)
})

type AntiBanFormValues = z.infer<typeof antiBanFormSchema>

export function WhatsAppAntiBanSettingsCard() {
  const { isAdmin } = useAuth()
  const queryClient = useQueryClient()

  const form = useForm<AntiBanFormValues>({
    resolver: zodResolver(antiBanFormSchema),
    defaultValues: {
      outboundPaused: false,
      maxPerMinute: 4,
      maxPerHour: 40,
      minGapSameCustomerMs: 120_000,
      pauseOnFailureRate: 0.3
    }
  })

  const configQuery = useQuery({
    queryKey: ['whatsapp-antiban'],
    enabled: isAdmin,
    queryFn: async () => {
      const result = await window.api.whatsapp.getAntiBan()
      if (!result.ok) throw new Error(result.error)
      return result.data
    }
  })

  useEffect(() => {
    if (configQuery.data) {
      form.reset(configQuery.data)
    }
  }, [configQuery.data, form])

  const saveMutation = useMutation({
    mutationFn: async (values: AntiBanFormValues) => {
      const result = await window.api.whatsapp.saveAntiBan(values)
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
    onSuccess: (data) => {
      toast.success('WhatsApp settings saved')
      form.reset(data)
      void queryClient.invalidateQueries({ queryKey: ['whatsapp-antiban'] })
    },
    onError: (error: Error) => toast.error(error.message)
  })

  if (!isAdmin) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Outbound limits</CardTitle>
        <CardDescription>
          Rate limits and safety controls to reduce ban risk on bulk or automated sends.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {configQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading settings…</p>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((values) => void saveMutation.mutateAsync(values))}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="outboundPaused"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Pause all outbound</FormLabel>
                      <FormDescription>Stops queue processing until re-enabled</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="maxPerMinute"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max messages per minute</FormLabel>
                      <FormControl>
                        <NumericInput integerOnly value={field.value} onNumberChange={field.onChange} onBlur={field.onBlur} name={field.name} ref={field.ref} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="maxPerHour"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max messages per hour</FormLabel>
                      <FormControl>
                        <NumericInput integerOnly value={field.value} onNumberChange={field.onChange} onBlur={field.onBlur} name={field.name} ref={field.ref} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="minGapSameCustomerMs"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min gap same customer (ms)</FormLabel>
                      <FormControl>
                        <NumericInput integerOnly value={field.value} onNumberChange={field.onChange} onBlur={field.onBlur} name={field.name} ref={field.ref} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pauseOnFailureRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pause on failure rate (0–1)</FormLabel>
                      <FormControl>
                        <NumericInput value={field.value} onNumberChange={field.onChange} onBlur={field.onBlur} name={field.name} ref={field.ref} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="animate-spin" />}
                Save settings
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  )
}
