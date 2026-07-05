import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { NumericInput } from '@/components/ui/numeric-input'
import { Label } from '@/components/ui/label'
import { OrderStatusBadge } from '@/components/ui/order-status-badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { OrderBillingPanel } from '@/components/orders/order-billing-panel'
import { useAuth } from '@/hooks/use-auth'
import { formatCurrency } from '@/lib/format'
import { calcLineTotal, formatExtraChargeLabel, productToLine } from '@/lib/order-lines'
import type { OrderInput, OrderLineInput, OrderStatus, OrderType } from '@shared/types/order'
import { nextStatuses } from '@shared/types/order'
import type { Product } from '@shared/types/product'
import type { Customer } from '@shared/types/customer'

function emptyLine(): OrderLineInput {
  return {
    nameSnapshot: '',
    skuSnapshot: '',
    unitSnapshot: 'pcs',
    qty: 1,
    rate: 0,
    discount: 0,
    taxPercent: 0
  }
}

export function OrderDetailPage() {
  const { id } = useParams()
  const isNew = id === 'new' || !id
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { isAdmin } = useAuth()

  const [type, setType] = useState<OrderType>('retail')
  const [customerId, setCustomerId] = useState<string>('')
  const [customerName, setCustomerName] = useState('Walk-in Customer')
  const [lines, setLines] = useState<OrderLineInput[]>([emptyLine()])
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [deliveryCharge, setDeliveryCharge] = useState(0)
  const [notes, setNotes] = useState('')
  const [productPicker, setProductPicker] = useState('')

  const orderQuery = useQuery({
    queryKey: ['order', id],
    enabled: !isNew && Boolean(id),
    queryFn: async () => {
      const result = await window.api.orders.get(id!)
      if (!result.ok) throw new Error(result.error)
      return result.data
    }
  })

  const productsQuery = useQuery({
    queryKey: ['products-order-form'],
    queryFn: async () => {
      const result = await window.api.products.list({ limit: 500, offset: 0 })
      if (!result.ok) throw new Error(result.error)
      return result.data.items
    }
  })

  const customersQuery = useQuery({
    queryKey: ['customers-order-form'],
    queryFn: async () => {
      const result = await window.api.customers.list({ limit: 500, offset: 0 })
      if (!result.ok) throw new Error(result.error)
      return result.data.items
    }
  })

  useEffect(() => {
    if (!orderQuery.data) return
    const order = orderQuery.data
    setType(order.type)
    setCustomerId(order.customerId ?? '')
    setCustomerName(order.customerName)
    setLines(
      order.lines.map((line) => ({
        productId: line.productId,
        nameSnapshot: line.nameSnapshot,
        skuSnapshot: line.skuSnapshot,
        unitSnapshot: line.unitSnapshot,
        qty: line.qty,
        rate: line.rate,
        discount: line.discount,
        hsnSnapshot: line.hsnSnapshot,
        taxPercent: line.taxPercent,
        extraCharges: line.extraCharges?.map((charge) => ({ ...charge })) ?? []
      }))
    )
    setDeliveryAddress(order.delivery?.address ?? '')
    setDeliveryCharge(order.delivery?.charge ?? 0)
    setNotes(order.notes)
  }, [orderQuery.data])

  const buildInput = (): OrderInput => ({
    type,
    customerId: customerId || null,
    customerName,
    lines,
    delivery:
      type === 'delivery'
        ? { address: deliveryAddress, charge: deliveryCharge, scheduledAt: null, notes: '' }
        : null,
    notes
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const input = buildInput()
      const result = isNew
        ? await window.api.orders.create(input)
        : await window.api.orders.update(id!, input)
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
    onSuccess: (order) => {
      toast.success(isNew ? 'Order created' : 'Order updated')
      void queryClient.invalidateQueries({ queryKey: ['orders'] })
      if (isNew) navigate(`/orders/${order.id}`, { replace: true })
      else void queryClient.invalidateQueries({ queryKey: ['order', id] })
    },
    onError: (error: Error) => toast.error(error.message)
  })

  const statusMutation = useMutation({
    mutationFn: async (status: OrderStatus) => {
      const result = await window.api.orders.updateStatus(id!, status)
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
    onSuccess: () => {
      toast.success('Status updated')
      void queryClient.invalidateQueries({ queryKey: ['orders'] })
      void queryClient.invalidateQueries({ queryKey: ['order', id] })
    },
    onError: (error: Error) => toast.error(error.message)
  })

  const order = orderQuery.data
  const readOnly = Boolean(
    order && (order.billingStatus === 'billed' || order.status === 'cancelled')
  )
  const nextSteps = order ? nextStatuses(order.type, order.status) : []
  const activeProducts = (productsQuery.data ?? []).filter((p) => p.active)

  const estimatedTotal = useMemo(() => {
    const lineTotal = lines.reduce((sum, line) => sum + calcLineTotal(line), 0)
    return Math.round((lineTotal + (type === 'delivery' ? deliveryCharge : 0)) * 100) / 100
  }, [lines, type, deliveryCharge])

  const addProductLine = (product: Product) => {
    setLines((current) => [...current, productToLine(product)])
  }

  const onCustomerChange = (value: string) => {
    setCustomerId(value === 'walk-in' ? '' : value)
    if (value === 'walk-in') return
    const customer = (customersQuery.data ?? []).find((item: Customer) => item.id === value)
    if (customer) {
      setCustomerName(customer.name)
      if (type === 'delivery' && customer.address) {
        setDeliveryAddress(customer.address)
      }
    }
  }

  const onProductPick = (productId: string) => {
    const product = activeProducts.find((item) => item.id === productId)
    if (product) addProductLine(product)
    setProductPicker('')
  }

  const updateLine = (index: number, patch: Partial<OrderLineInput>) => {
    setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)))
  }

  const removeLine = (index: number) => {
    setLines((current) => current.filter((_, i) => i !== index))
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-start gap-3">
        <Button variant="outline" size="icon" asChild className="mt-0.5 shrink-0">
          <Link to="/orders">
            <ArrowLeft className="size-4" />
            <span className="sr-only">Back to orders</span>
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-semibold tracking-tight">
            {isNew ? 'New order' : order?.orderNo ?? 'Order'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isNew ? 'Create a retail or delivery order with line items.' : 'View and edit order details.'}
          </p>
          {order && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <OrderStatusBadge status={order.status} />
              <Badge variant="outline" className="capitalize">
                {order.type}
              </Badge>
            </div>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Customer & type</CardTitle>
          <CardDescription>Choose order type and link a customer profile if needed.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Order type</Label>
              <Select value={type} disabled={readOnly} onValueChange={(value) => setType(value as OrderType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="delivery">Delivery</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Customer profile</Label>
              <Select
                value={customerId || 'walk-in'}
                disabled={readOnly}
                onValueChange={onCustomerChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="walk-in">Walk-in / custom name</SelectItem>
                  {(customersQuery.data ?? [])
                    .filter((c) => c.active)
                    .map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer-name">Customer name on order</Label>
            <Input
              id="customer-name"
              value={customerName}
              disabled={readOnly}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </div>

          {type === 'delivery' && (
            <div className="grid gap-4 md:grid-cols-[1fr_160px]">
              <div className="space-y-2">
                <Label htmlFor="delivery-address">Delivery address</Label>
                <Textarea
                  id="delivery-address"
                  value={deliveryAddress}
                  disabled={readOnly}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  rows={3}
                  placeholder="Full delivery address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="delivery-charge">Delivery charge (₹)</Label>
                <NumericInput
                  id="delivery-charge"
                  value={deliveryCharge}
                  disabled={readOnly}
                  onNumberChange={setDeliveryCharge}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Line items</CardTitle>
          <CardDescription>Add products from catalog or enter custom lines.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!readOnly && (
            <div className="space-y-2 md:max-w-md">
              <Label>Quick add product</Label>
              <Select value={productPicker} onValueChange={onProductPick}>
                <SelectTrigger>
                  <SelectValue placeholder="Select product to add…" />
                </SelectTrigger>
                <SelectContent>
                  {activeProducts.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} — {formatCurrency(product.price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">Item</TableHead>
                  <TableHead className="w-[80px]">Qty</TableHead>
                  <TableHead className="w-[100px]">Rate</TableHead>
                  <TableHead className="w-[80px]">Tax %</TableHead>
                  <TableHead className="w-[100px] text-right">Line total</TableHead>
                  {!readOnly && <TableHead className="w-[60px]" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line, index) => {
                  const lineTotal = calcLineTotal(line)

                  return (
                    <TableRow key={index}>
                      <TableCell>
                        <Input
                          placeholder="Item name"
                          value={line.nameSnapshot}
                          disabled={readOnly}
                          onChange={(e) => updateLine(index, { nameSnapshot: e.target.value })}
                          className="h-8"
                        />
                        {(line.extraCharges ?? []).map((charge, chargeIndex) => (
                          <p key={chargeIndex} className="mt-1 text-[11px] text-muted-foreground">
                            {formatExtraChargeLabel(charge)}
                          </p>
                        ))}
                      </TableCell>
                      <TableCell>
                        <NumericInput
                          integerOnly
                          value={line.qty}
                          disabled={readOnly}
                          onNumberChange={(qty) => updateLine(index, { qty })}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <NumericInput
                          value={line.rate}
                          disabled={readOnly}
                          onNumberChange={(rate) => updateLine(index, { rate })}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <NumericInput
                          value={line.taxPercent}
                          disabled={readOnly}
                          onNumberChange={(taxPercent) => updateLine(index, { taxPercent })}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(lineTotal)}</TableCell>
                      {!readOnly && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => removeLine(index)}
                          >
                            <Trash2 className="size-4" />
                            <span className="sr-only">Remove line</span>
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {!readOnly && (
            <Button variant="outline" size="sm" onClick={() => setLines([...lines, emptyLine()])}>
              <Plus className="size-4" />
              Add empty line
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes & total</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="order-notes">Notes</Label>
            <Textarea
              id="order-notes"
              value={notes}
              disabled={readOnly}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes for this order"
              rows={2}
            />
          </div>

          <Separator />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              {type === 'delivery' && deliveryCharge > 0 && (
                <p className="text-sm text-muted-foreground">
                  Extra charges (delivery): {formatCurrency(deliveryCharge)}
                </p>
              )}
              <p className="text-sm text-muted-foreground">Estimated total</p>
              <p className="text-2xl font-semibold">{formatCurrency(estimatedTotal)}</p>
            </div>
            {!readOnly && (
              <Button disabled={saveMutation.isPending} onClick={() => void saveMutation.mutateAsync()}>
                {saveMutation.isPending && <Loader2 className="animate-spin" />}
                {isNew ? 'Create order' : 'Save changes'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {!isNew && order && nextSteps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Update status</CardTitle>
            <CardDescription>Move this order to the next step in the workflow.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {nextSteps.map((status) => {
              if (status === 'cancelled' && !isAdmin) return null
              return (
                <Button
                  key={status}
                  variant={status === 'cancelled' ? 'destructive' : 'default'}
                  disabled={statusMutation.isPending}
                  onClick={() => void statusMutation.mutateAsync(status)}
                >
                  {status.replaceAll('_', ' ')}
                </Button>
              )
            })}
          </CardContent>
        </Card>
      )}

      {!isNew && order && <OrderBillingPanel order={order} />}
    </div>
  )
}
