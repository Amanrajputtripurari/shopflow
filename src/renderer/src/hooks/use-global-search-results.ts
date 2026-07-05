import { useEffect, useMemo, useState } from 'react'

import { searchCustomers } from '@/lib/customers-api'
import { hasPageKeywordMatch, matchGlobalSearchPages } from '@/lib/global-search-registry'
import type { Customer } from '@shared/types/customer'
import type { Order } from '@shared/types/order'

interface GlobalSearchEntityResults {
  customers: Customer[]
  orders: Order[]
  loading: boolean
}

export function useGlobalSearchResults(query: string, enabled: boolean) {
  const trimmed = query.trim()
  const pageResults = useMemo(() => matchGlobalSearchPages(trimmed), [trimmed])
  const shouldSearchEntities = enabled && trimmed.length > 0 && !hasPageKeywordMatch(trimmed)

  const [entityResults, setEntityResults] = useState<GlobalSearchEntityResults>({
    customers: [],
    orders: [],
    loading: false
  })

  useEffect(() => {
    if (!shouldSearchEntities) {
      setEntityResults({ customers: [], orders: [], loading: false })
      return
    }

    let cancelled = false
    const timer = window.setTimeout(() => {
      void (async () => {
        setEntityResults((current) => ({ ...current, loading: true }))

        const [customerResult, orderResult] = await Promise.all([
          searchCustomers({ search: trimmed, limit: 8, activeOnly: true }),
          window.api.orders.list({ search: trimmed, limit: 8, offset: 0 })
        ])

        if (cancelled) return

        setEntityResults({
          customers: customerResult.ok ? customerResult.data.items : [],
          orders: orderResult.ok ? orderResult.data.items : [],
          loading: false
        })
      })()
    }, 250)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [shouldSearchEntities, trimmed])

  return {
    pageResults,
    shouldSearchEntities,
    customers: entityResults.customers,
    orders: entityResults.orders,
    entitiesLoading: entityResults.loading
  }
}
