import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useFieldArray, useForm } from 'react-hook-form'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/use-auth'
import type { MenuActionType } from '@shared/types/whatsapp'

const menuItemSchema = z.object({
  key: z.string().min(1, 'Key is required'),
  label: z.string().min(1, 'Label is required'),
  action: z.enum(['send_text', 'send_pdf', 'open_staff_queue', 'trigger_flow']),
  textTemplate: z.string().optional(),
  enabled: z.boolean()
})

const keywordSchema = z.object({
  pattern: z.string().min(1, 'Pattern is required'),
  menuKey: z.string().min(1, 'Menu key is required')
})

const menuFormSchema = z.object({
  enabled: z.boolean(),
  welcomeTemplate: z.string().min(1, 'Welcome template is required'),
  items: z.array(menuItemSchema),
  keywords: z.array(keywordSchema)
})

type MenuFormValues = z.infer<typeof menuFormSchema>

const ACTION_OPTIONS: { value: MenuActionType; label: string }[] = [
  { value: 'send_text', label: 'Send text' },
  { value: 'send_pdf', label: 'Send last bill PDF' },
  { value: 'open_staff_queue', label: 'Open staff queue' },
  { value: 'trigger_flow', label: 'Trigger custom flow' }
]

function keywordsToRows(keywords: Record<string, string>): MenuFormValues['keywords'] {
  return Object.entries(keywords).map(([pattern, menuKey]) => ({ pattern, menuKey }))
}

function rowsToKeywords(rows: MenuFormValues['keywords']): Record<string, string> {
  return Object.fromEntries(rows.map((row) => [row.pattern, row.menuKey]))
}

export function WhatsAppMenuSettingsCard() {
  const { isAdmin } = useAuth()
  const queryClient = useQueryClient()

  const form = useForm<MenuFormValues>({
    resolver: zodResolver(menuFormSchema),
    defaultValues: {
      enabled: true,
      welcomeTemplate: '',
      items: [],
      keywords: []
    }
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items'
  })

  const {
    fields: keywordFields,
    append: appendKeyword,
    remove: removeKeyword
  } = useFieldArray({
    control: form.control,
    name: 'keywords'
  })

  const menuQuery = useQuery({
    queryKey: ['whatsapp-menu'],
    queryFn: async () => {
      const result = await window.api.whatsapp.getMenu()
      if (!result.ok) throw new Error(result.error)
      return result.data
    }
  })

  useEffect(() => {
    if (!menuQuery.data) return
    form.reset({
      enabled: menuQuery.data.enabled,
      welcomeTemplate: menuQuery.data.welcomeTemplate,
      items: menuQuery.data.items.map((item) => ({
        key: item.key,
        label: item.label,
        action: item.action,
        textTemplate: item.textTemplate ?? '',
        enabled: item.enabled
      })),
      keywords: keywordsToRows(menuQuery.data.keywords)
    })
  }, [menuQuery.data, form])

  const saveMutation = useMutation({
    mutationFn: async (values: MenuFormValues) => {
      const result = await window.api.whatsapp.saveMenu({
        enabled: values.enabled,
        welcomeTemplate: values.welcomeTemplate,
        items: values.items.map((item) => ({
          ...item,
          textTemplate: item.textTemplate || undefined
        })),
        keywords: rowsToKeywords(values.keywords)
      })
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
    onSuccess: () => {
      toast.success('WhatsApp menu saved')
      void queryClient.invalidateQueries({ queryKey: ['whatsapp-menu'] })
    },
    onError: (error: Error) => toast.error(error.message)
  })

  if (!isAdmin) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">WhatsApp menu</CardTitle>
        <CardDescription>
          Numbered auto-reply menu for inbound messages. Use {'{shopName}'} and {'{menuItems}'} in welcome
          text. Keyword patterns support regex when enabled in Settings → Messaging behavior.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) => void saveMutation.mutateAsync(values))}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="enabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <FormLabel>Menu enabled</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="welcomeTemplate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Welcome template</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={5} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium">Menu items</p>
                <p className="text-xs text-muted-foreground">Customers reply with the item key (e.g. 1, 2, 3).</p>
              </div>
              {fields.map((field, index) => (
                <div key={field.id} className="grid gap-2 rounded-lg border p-3 md:grid-cols-5">
                  <FormField
                    control={form.control}
                    name={`items.${index}.key`}
                    render={({ field: itemField }) => (
                      <FormItem>
                        <FormControl>
                          <Input {...itemField} placeholder="Key" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`items.${index}.label`}
                    render={({ field: itemField }) => (
                      <FormItem>
                        <FormControl>
                          <Input {...itemField} placeholder="Label" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`items.${index}.action`}
                    render={({ field: itemField }) => (
                      <FormItem>
                        <Select value={itemField.value} onValueChange={itemField.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Action" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ACTION_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`items.${index}.textTemplate`}
                    render={({ field: itemField }) => (
                      <FormItem>
                        <FormControl>
                          <Input {...itemField} placeholder="Reply template (optional)" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex items-center gap-2">
                    <FormField
                      control={form.control}
                      name={`items.${index}.enabled`}
                      render={({ field: itemField }) => (
                        <FormItem>
                          <FormControl>
                            <Switch checked={itemField.value} onCheckedChange={itemField.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <Button type="button" variant="outline" size="icon" onClick={() => remove(index)}>
                      <Trash2 className="size-4" />
                      <span className="sr-only">Remove item</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium">Keyword triggers</p>
                <p className="text-sm text-muted-foreground">
                  Pattern maps to a menu item key. Use <code>menu</code> as the menu key to show the welcome menu.
                  Example regex: <code>^(bill|invoice)$</code>
                </p>
              </div>
              {keywordFields.map((field, index) => (
                <div key={field.id} className="grid gap-2 rounded-lg border p-3 md:grid-cols-[1fr_160px_auto]">
                  <FormField
                    control={form.control}
                    name={`keywords.${index}.pattern`}
                    render={({ field: keywordField }) => (
                      <FormItem>
                        <FormControl>
                          <Input {...keywordField} placeholder="Pattern (regex or text)" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`keywords.${index}.menuKey`}
                    render={({ field: keywordField }) => (
                      <FormItem>
                        <FormControl>
                          <Input {...keywordField} placeholder="Menu key" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="button" variant="outline" size="icon" onClick={() => removeKeyword(index)}>
                    <Trash2 className="size-4" />
                    <span className="sr-only">Remove keyword</span>
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  append({
                    key: String(fields.length + 1),
                    label: 'New option',
                    action: 'send_text',
                    textTemplate: '',
                    enabled: true
                  })
                }
              >
                <Plus className="size-4" />
                Add item
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => appendKeyword({ pattern: '^keyword$', menuKey: '1' })}
              >
                <Plus className="size-4" />
                Add keyword
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="animate-spin" />}
                Save menu
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
