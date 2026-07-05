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

const messagingFormSchema = z.object({
  showTypingIndicator: z.boolean(),
  typingDurationMs: z.coerce.number().min(0),
  skipQuotedReplies: z.boolean(),
  skipBusinessAccounts: z.boolean(),
  menuUseRegex: z.boolean()
})

type MessagingFormValues = z.infer<typeof messagingFormSchema>

export function WhatsAppMessagingSettingsCard() {
  const { isAdmin } = useAuth()
  const queryClient = useQueryClient()

  const form = useForm<MessagingFormValues>({
    resolver: zodResolver(messagingFormSchema),
    defaultValues: {
      showTypingIndicator: true,
      typingDurationMs: 1500,
      skipQuotedReplies: true,
      skipBusinessAccounts: true,
      menuUseRegex: true
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
      showTypingIndicator: configQuery.data.showTypingIndicator,
      typingDurationMs: configQuery.data.typingDurationMs,
      skipQuotedReplies: configQuery.data.skipQuotedReplies,
      skipBusinessAccounts: configQuery.data.skipBusinessAccounts,
      menuUseRegex: configQuery.data.menuUseRegex
    })
  }, [configQuery.data, form])

  const saveMutation = useMutation({
    mutationFn: async (values: MessagingFormValues) => {
      const result = await window.api.whatsapp.saveMessaging(values)
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
    onSuccess: (data) => {
      toast.success('Messaging settings saved')
      form.reset({
        showTypingIndicator: data.showTypingIndicator,
        typingDurationMs: data.typingDurationMs,
        skipQuotedReplies: data.skipQuotedReplies,
        skipBusinessAccounts: data.skipBusinessAccounts,
        menuUseRegex: data.menuUseRegex
      })
      void queryClient.invalidateQueries({ queryKey: ['whatsapp-messaging'] })
    },
    onError: (error: Error) => toast.error(error.message)
  })

  if (!isAdmin) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Messaging behavior</CardTitle>
        <CardDescription>
          Typing indicators, inbound filters, and menu keyword matching.
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
                name="showTypingIndicator"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Show typing before send</FormLabel>
                      <FormDescription>
                        Send a composing indicator before every outbound WhatsApp message.
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
                name="typingDurationMs"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Typing duration (ms)</FormLabel>
                    <FormControl>
                      <NumericInput
                        integerOnly
                        value={field.value}
                        onNumberChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormDescription>How long the typing indicator stays visible before sending.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="skipQuotedReplies"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Skip quoted replies</FormLabel>
                      <FormDescription>
                        Do not auto-reply when the customer replies to a specific message.
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
                name="skipBusinessAccounts"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Skip business accounts</FormLabel>
                      <FormDescription>
                        Do not auto-reply to WhatsApp Business or non-personal chats.
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
                name="menuUseRegex"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Regex menu keywords</FormLabel>
                      <FormDescription>
                        Match menu triggers using regex patterns instead of exact text only.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="animate-spin" />}
                Save messaging settings
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  )
}
