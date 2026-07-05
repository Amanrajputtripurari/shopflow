import { useEffect, useRef, useState } from 'react'
import { Check, ChevronsUpDown, Search, UserRound } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useCustomerSearch } from '@/hooks/use-customer-search'
import { cn } from '@/lib/utils'
import type { Customer } from '@shared/types/customer'

interface CustomerSearchComboboxProps {
  value: string | null
  displayLabel: string
  onSelect: (customer: Customer | null) => void
  className?: string
}

function CustomerOptionSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <Skeleton className="size-8 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  )
}

export function CustomerSearchCombobox({
  value,
  displayLabel,
  onSelect,
  className
}: CustomerSearchComboboxProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const { search, setSearch, items, total, hasMore, loading, loadingMore, loadMore, reset } =
    useCustomerSearch({ open })

  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => searchInputRef.current?.focus(), 0)
    return () => window.clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  useEffect(() => {
    if (!open) {
      reset()
    }
  }, [open, reset])

  useEffect(() => {
    if (!open || !hasMore || loading || loadingMore) return

    const sentinel = sentinelRef.current
    const list = listRef.current
    if (!sentinel || !list) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadMore()
        }
      },
      { root: list, rootMargin: '48px' }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [open, hasMore, loading, loadingMore, loadMore, items.length])

  const handleSelect = (customer: Customer | null) => {
    onSelect(customer)
    setOpen(false)
  }

  return (
    <div ref={containerRef} className={cn('relative min-w-0', className)}>
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        className="h-9 w-full justify-between gap-2 px-3 font-normal"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="flex min-w-0 items-center gap-2">
          <UserRound className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{displayLabel}</span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
      </Button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md">
          <div className="border-b p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Type name or phone…"
                className="h-8 pl-8"
                autoComplete="off"
              />
            </div>
          </div>

          <div ref={listRef} className="max-h-[280px] overflow-y-auto overscroll-contain p-1">
            <button
              type="button"
              className={cn(
                'flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent',
                !value && 'bg-accent'
              )}
              onClick={() => handleSelect(null)}
            >
              <Check className={cn('size-4 shrink-0', value ? 'opacity-0' : 'opacity-100')} />
              <span>Walk-in customer</span>
            </button>

            {loading ? (
              <>
                <CustomerOptionSkeleton />
                <CustomerOptionSkeleton />
                <CustomerOptionSkeleton />
              </>
            ) : items.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                {search.trim() ? 'No customers found' : 'No active customers'}
              </p>
            ) : (
              items.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  className={cn(
                    'flex w-full items-start gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent',
                    value === customer.id && 'bg-accent'
                  )}
                  onClick={() => handleSelect(customer)}
                >
                  <Check
                    className={cn(
                      'mt-0.5 size-4 shrink-0',
                      value === customer.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{customer.name}</span>
                    {customer.phone ? (
                      <span className="block truncate text-xs text-muted-foreground">{customer.phone}</span>
                    ) : null}
                  </span>
                </button>
              ))
            )}

            {loadingMore && (
              <>
                <CustomerOptionSkeleton />
                <CustomerOptionSkeleton />
              </>
            )}

            <div ref={sentinelRef} className="h-1" />

            {!loading && items.length > 0 && (
              <p className="px-3 py-2 text-center text-[11px] text-muted-foreground">
                {items.length} of {total}
                {hasMore ? ' · scroll for more' : ''}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
