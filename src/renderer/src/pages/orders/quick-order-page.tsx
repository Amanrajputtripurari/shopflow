import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Truck } from 'lucide-react'
import { toast } from 'sonner'

import { OrderCartPanel } from '@/components/orders/order-cart-panel'
import { CustomerSearchCombobox } from '@/components/orders/customer-search-combobox'
import { ProductPicker } from '@/components/orders/product-picker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NumericInput } from '@/components/ui/numeric-input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  addProductToLines,
  calcOrderTotal,
  findProductByQuery,
  updateLineQty
} from '@/lib/order-lines'
import { useRecentProducts } from '@/hooks/use-recent-products'
import { cn } from '@/lib/utils'
import type { OrderInput, OrderLineInput, OrderType } from '@shared/types/order'
import type { Customer } from '@shared/types/customer'
import type { Product } from '@shared/types/product'

const WALK_IN_NAME = 'Walk-in Customer'

function defaultFormState() {
  return {
    type: 'retail' as OrderType,
    customerId: '',
    customerName: WALK_IN_NAME,
    lines: [] as OrderLineInput[],
    deliveryAddress: '',
    deliveryCharge: 0,
    notes: '',
    search: ''
  }
}

export function QuickOrderPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const presetCustomerId = searchParams.get('customerId')
  const queryClient = useQueryClient()
  const { recentIds, trackProduct } = useRecentProducts()

  const [type, setType] = useState<OrderType>('retail')
  const [customerId, setCustomerId] = useState('')
  const [customerName, setCustomerName] = useState(WALK_IN_NAME)
  const [lines, setLines] = useState<OrderLineInput[]>([])
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [deliveryCharge, setDeliveryCharge] = useState(0)
  const [notes, setNotes] = useState('')
  const [search, setSearch] = useState('')

  const productsQuery = useQuery({
    queryKey: ['products-quick-order'],
    queryFn: async () => {
      const result = await window.api.products.list({ limit: 500, offset: 0 })
      if (!result.ok) throw new Error(result.error)
      return result.data.items
    }
  })

  const activeProducts = useMemo(
    () => (productsQuery.data ?? []).filter((product) => product.active),
    [productsQuery.data]
  )

  const total = useMemo(
    () => calcOrderTotal(lines, type === 'delivery' ? deliveryCharge : 0),
    [lines, type, deliveryCharge]
  )

  const canSubmit = lines.length > 0 && (type !== 'delivery' || deliveryAddress.trim().length > 0)

  const resetForm = useCallback(() => {
    const fresh = defaultFormState()
    setType(fresh.type)
    setCustomerId(fresh.customerId)
    setCustomerName(fresh.customerName)
    setLines(fresh.lines)
    setDeliveryAddress(fresh.deliveryAddress)
    setDeliveryCharge(fresh.deliveryCharge)
    setNotes(fresh.notes)
    setSearch(fresh.search)
  }, [])

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

  const createMutation = useMutation({
    mutationFn: async () => {
      const result = await window.api.orders.create(buildInput())
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
    onSuccess: (order) => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] })
      return order
    },
    onError: (error: Error) => toast.error(error.message)
  })

  const addProduct = useCallback(
    (product: Product) => {
      setLines((current) => addProductToLines(current, product))
      trackProduct(product.id)
      setSearch('')
    },
    [trackProduct]
  )

  const handleSearchSubmit = useCallback(() => {
    const match = findProductByQuery(activeProducts, search)
    if (match) {
      addProduct(match)
      return
    }
    if (search.trim()) {
      toast.error('No product found for that search')
    }
  }, [activeProducts, search, addProduct])

  const onCustomerSelect = (customer: Customer | null) => {
    if (!customer) {
      setCustomerId('')
      setCustomerName(WALK_IN_NAME)
      return
    }

    setCustomerId(customer.id)
    setCustomerName(customer.name)
    if (type === 'delivery' && customer.address) {
      setDeliveryAddress(customer.address)
    }
  }

  useEffect(() => {
    if (!presetCustomerId) return

    void window.api.customers.get(presetCustomerId).then((result) => {
      if (!result.ok) return
      const customer = result.data
      setCustomerId(customer.id)
      setCustomerName(customer.name)
      setDeliveryAddress((current) => customer.address || current)
    })
  }, [presetCustomerId])

  const handleTypeChange = (nextType: OrderType) => {
    setType(nextType)
  }

  const submitOrder = useCallback(
    async (andNext: boolean) => {
      try {
        const order = await createMutation.mutateAsync()
        toast.success(`Order ${order.orderNo} created`)
        if (andNext) {
          resetForm()
        } else {
          navigate(`/orders/${order.id}`)
        }
      } catch {
        // Error toast handled in mutation
      }
    },
    [createMutation, navigate, resetForm]
  )

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault()
        if (canSubmit && !createMutation.isPending) {
          void submitOrder(false)
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [canSubmit, createMutation.isPending, submitOrder])

  return (
    <div className="-m-6 flex h-[calc(100dvh-4rem)] flex-col overflow-hidden">
      {/* Top bar — customer & order type always visible */}
      <div className="shrink-0 border-b bg-background px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="icon" className="size-9 shrink-0" asChild>
            <Link to="/orders">
              <ArrowLeft className="size-4" />
              <span className="sr-only">Back to orders</span>
            </Link>
          </Button>

          <div className="min-w-0 shrink-0">
            <h2 className="text-base font-semibold leading-none">Quick order</h2>
          </div>

          <div className="mx-2 hidden h-6 w-px bg-border sm:block" />

          <div className="flex min-w-[200px] flex-1 items-center sm:max-w-xs">
            <CustomerSearchCombobox
              value={customerId || null}
              displayLabel={customerId ? customerName : 'Walk-in customer'}
              onSelect={onCustomerSelect}
              className="w-full"
            />
          </div>

          <div className="flex shrink-0 rounded-lg border p-0.5">
            {(['retail', 'delivery'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => handleTypeChange(option)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors',
                  type === option
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {option === 'delivery' ? <Truck className="size-3.5" /> : null}
                {option}
              </button>
            ))}
          </div>

          {customerId && (
            <div className="w-full sm:ml-auto sm:w-auto sm:min-w-[200px] sm:max-w-[240px]">
              <Input
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="Name on bill"
                className="h-9"
              />
            </div>
          )}
        </div>

        {type === 'delivery' && (
          <div className="mt-3 grid gap-3 border-t pt-3 sm:grid-cols-[1fr_140px]">
            <div className="space-y-1.5">
              <Label htmlFor="delivery-address" className="text-xs text-muted-foreground">
                Delivery address
              </Label>
              <Textarea
                id="delivery-address"
                value={deliveryAddress}
                onChange={(event) => setDeliveryAddress(event.target.value)}
                rows={2}
                placeholder="Required for delivery orders"
                className="min-h-[60px] resize-none bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="delivery-charge" className="text-xs text-muted-foreground">
                Delivery charge (₹)
              </Label>
              <NumericInput
                id="delivery-charge"
                value={deliveryCharge}
                onNumberChange={setDeliveryCharge}
                className="h-9 bg-background"
              />
            </div>
          </div>
        )}
      </div>

      {/* Main split — scroll only inside panels */}
      <div className="grid min-h-0 flex-1 grid-rows-2 md:grid-cols-[1fr_300px] md:grid-rows-1 xl:grid-cols-[1fr_360px]">
        <div className="min-h-0 overflow-hidden border-b bg-card md:border-b-0 md:border-r">
          <ProductPicker
            products={activeProducts}
            recentIds={recentIds}
            loading={productsQuery.isLoading}
            search={search}
            onSearchChange={setSearch}
            onAddProduct={addProduct}
            onSearchSubmit={handleSearchSubmit}
          />
        </div>

        <div className="min-h-0 overflow-hidden bg-card">
          <OrderCartPanel
            lines={lines}
            notes={notes}
            total={total}
            saving={createMutation.isPending}
            canSubmit={canSubmit}
            onNotesChange={setNotes}
            onQtyChange={(index, delta) => setLines((current) => updateLineQty(current, index, delta))}
            onRemoveLine={(index) => setLines((current) => current.filter((_, i) => i !== index))}
            onCreate={(andNext) => void submitOrder(andNext)}
          />
        </div>
      </div>
    </div>
  )
}
