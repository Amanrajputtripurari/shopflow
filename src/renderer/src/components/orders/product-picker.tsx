import { useEffect, useMemo, useRef } from 'react'
import { Package, Search } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { filterProducts } from '@/lib/order-lines'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Product } from '@shared/types/product'

interface ProductPickerProps {
  products: Product[]
  recentIds: string[]
  loading?: boolean
  search: string
  onSearchChange: (value: string) => void
  onAddProduct: (product: Product) => void
  onSearchSubmit: () => void
}

export function ProductPicker({
  products,
  recentIds,
  loading,
  search,
  onSearchChange,
  onAddProduct,
  onSearchSubmit
}: ProductPickerProps) {
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    searchRef.current?.focus()
  }, [])

  const recentProducts = useMemo(
    () =>
      recentIds
        .map((id) => products.find((product) => product.id === id))
        .filter((product): product is Product => Boolean(product)),
    [products, recentIds]
  )

  const filtered = useMemo(() => filterProducts(products, search), [products, search])

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 space-y-3 border-b px-4 py-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchRef}
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                onSearchSubmit()
              }
              if (event.key === 'Escape') {
                onSearchChange('')
                searchRef.current?.focus()
              }
            }}
            placeholder="Search name or SKU — Enter to add"
            className="h-10 pl-9"
            autoComplete="off"
          />
        </div>

        {recentProducts.length > 0 && !search && (
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
            <span className="shrink-0 text-xs font-medium text-muted-foreground">Recent</span>
            {recentProducts.map((product) => (
              <Button
                key={product.id}
                type="button"
                variant="secondary"
                size="sm"
                className="h-7 shrink-0 gap-1.5 px-2.5 text-xs"
                onClick={() => onAddProduct(product)}
              >
                <span className="max-w-[120px] truncate">{product.name}</span>
                <span className="text-muted-foreground">{formatCurrency(product.price)}</span>
              </Button>
            ))}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 12 }).map((_, index) => (
              <Skeleton key={index} className="h-[104px] rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-full min-h-[160px] flex-col items-center justify-center rounded-lg border border-dashed text-center">
            <Package className="mb-2 size-8 text-muted-foreground/60" />
            <p className="text-sm font-medium">No products match</p>
            <p className="text-xs text-muted-foreground">Try another search term</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filtered.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => onAddProduct(product)}
                className={cn(
                  'flex h-[104px] flex-col justify-between rounded-lg border bg-background p-3 text-left transition-colors',
                  'hover:border-primary hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                )}
              >
                <span className="line-clamp-2 text-sm font-medium leading-tight">{product.name}</span>
                <div className="flex items-end justify-between gap-2">
                  <span className="text-sm font-semibold tabular-nums">{formatCurrency(product.price)}</span>
                  <Badge variant="outline" className="shrink-0 px-1.5 py-0 text-[10px] font-normal">
                    {product.sku}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
