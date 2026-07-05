import { useCallback, useEffect, useRef, useState } from 'react'

import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { searchCustomers } from '@/lib/customers-api'
import type { Customer } from '@shared/types/customer'

const PAGE_SIZE = 10

interface UseCustomerSearchOptions {
  open: boolean
  pageSize?: number
}

export function useCustomerSearch({ open, pageSize = PAGE_SIZE }: UseCustomerSearchOptions) {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [items, setItems] = useState<Customer[]>([])
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const requestIdRef = useRef(0)

  const fetchPage = useCallback(
    async (offset: number, term: string, append: boolean) => {
      const requestId = ++requestIdRef.current

      if (append) {
        setLoadingMore(true)
      } else {
        setLoading(true)
      }

      try {
        const result = await searchCustomers({
          search: term || undefined,
          limit: pageSize,
          offset,
          activeOnly: true
        })

        if (requestId !== requestIdRef.current) return
        if (!result.ok) throw new Error(result.error)

        setItems((current) => (append ? [...current, ...result.data.items] : result.data.items))
        setTotal(result.data.total)
        setHasMore(result.data.hasMore)
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false)
          setLoadingMore(false)
        }
      }
    },
    [pageSize]
  )

  useEffect(() => {
    if (!open) return
    void fetchPage(0, debouncedSearch, false)
  }, [open, debouncedSearch, fetchPage])

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore || loading) return
    void fetchPage(items.length, debouncedSearch, true)
  }, [hasMore, loadingMore, loading, items.length, debouncedSearch, fetchPage])

  const reset = useCallback(() => {
    requestIdRef.current += 1
    setSearch('')
    setItems([])
    setTotal(0)
    setHasMore(false)
    setLoading(false)
    setLoadingMore(false)
  }, [])

  return {
    search,
    setSearch,
    items,
    total,
    hasMore,
    loading,
    loadingMore,
    loadMore,
    reset
  }
}
