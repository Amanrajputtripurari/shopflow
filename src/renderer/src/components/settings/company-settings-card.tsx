import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Loader2 } from 'lucide-react'
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
import { NumericInput } from '@/components/ui/numeric-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import type { CompanyInput, CompanyProfile } from '@shared/types/company'

const companyFormSchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  gstin: z.string(),
  address: z.string(),
  phone: z.string(),
  defaultBillType: z.enum(['simple', 'gst']),
  billingSeries: z.object({
    simplePrefix: z.string().min(1, 'Prefix is required'),
    simpleNext: z.coerce.number().min(1, 'Must be at least 1'),
    gstPrefix: z.string().min(1, 'Prefix is required'),
    gstNext: z.coerce.number().min(1, 'Must be at least 1')
  }),
  stockSettings: z.object({
    stockTrackingEnabled: z.boolean(),
    stockDeductOn: z.enum(['confirm', 'bill']),
    allowNegativeStock: z.boolean()
  })
})

type CompanyFormValues = z.infer<typeof companyFormSchema>

function toFormValues(profile: CompanyProfile): CompanyFormValues {
  return {
    name: profile.name,
    gstin: profile.gstin,
    address: profile.address,
    phone: profile.phone,
    defaultBillType: profile.defaultBillType,
    billingSeries: { ...profile.billingSeries },
    stockSettings: { ...profile.stockSettings }
  }
}

export function CompanySettingsCard() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: {
      name: '',
      gstin: '',
      address: '',
      phone: '',
      defaultBillType: 'simple',
      billingSeries: {
        simplePrefix: 'BILL',
        simpleNext: 1,
        gstPrefix: 'INV',
        gstNext: 1
      },
      stockSettings: {
        stockTrackingEnabled: false,
        stockDeductOn: 'confirm',
        allowNegativeStock: false
      }
    }
  })

  useEffect(() => {
    void window.api.company.get().then((result) => {
      if (result.ok) {
        form.reset(toFormValues(result.data))
      }
      setLoading(false)
    })
  }, [form])

  const onSubmit = async (values: CompanyFormValues) => {
    setSaving(true)
    const input: CompanyInput = {
      name: values.name,
      gstin: values.gstin,
      address: values.address,
      phone: values.phone,
      defaultBillType: values.defaultBillType,
      billingSeries: values.billingSeries,
      stockSettings: values.stockSettings
    }
    const result = await window.api.company.save(input)
    setSaving(false)

    if (result.ok) {
      toast.success('Company settings saved')
      form.reset(toFormValues(result.data))
    } else {
      toast.error(result.error)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading company settings…
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Company & billing</CardTitle>
        <CardDescription>GSTIN, invoice series, and stock settings</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Company name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gstin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GSTIN</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="defaultBillType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default bill type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="simple">Simple</SelectItem>
                        <SelectItem value="gst">GST</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="billingSeries.simplePrefix"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Simple series prefix</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="billingSeries.simpleNext"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Simple next number</FormLabel>
                    <FormControl>
                      <NumericInput integerOnly value={field.value} onNumberChange={field.onChange} onBlur={field.onBlur} name={field.name} ref={field.ref} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="billingSeries.gstPrefix"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GST series prefix</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="billingSeries.gstNext"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GST next number</FormLabel>
                    <FormControl>
                      <NumericInput integerOnly value={field.value} onNumberChange={field.onChange} onBlur={field.onBlur} name={field.name} ref={field.ref} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="stockSettings.stockTrackingEnabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3 md:col-span-2">
                    <div className="space-y-0.5">
                      <FormLabel>Stock tracking</FormLabel>
                      <p className="text-xs text-muted-foreground">Track inventory levels per product</p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="stockSettings.stockDeductOn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deduct stock on</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="confirm">Order confirm</SelectItem>
                        <SelectItem value="bill">Bill generate</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="stockSettings.allowNegativeStock"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Allow negative stock</FormLabel>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}
              Save company settings
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
