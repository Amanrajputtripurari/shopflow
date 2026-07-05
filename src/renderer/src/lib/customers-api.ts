import type { CustomerSearchQuery, CustomerSearchResult } from '@shared/types/customer'
import type { IpcResult } from '@shared/types/settings'

/** Paginated customer search — falls back to list() if preload is stale (dev HMR). */
export async function searchCustomers(
  query: CustomerSearchQuery = {}
): Promise<IpcResult<CustomerSearchResult>> {
  const limit = Math.min(Math.max(query.limit ?? 10, 1), 50)
  const offset = Math.max(query.offset ?? 0, 0)

  if (typeof window.api.customers.search === 'function') {
    return window.api.customers.search({ ...query, limit, offset })
  }

  const listResult = await window.api.customers.list({
    search: query.search,
    limit: 10_000,
    offset: 0
  })
  if (!listResult.ok) return listResult

  const activeOnly = query.activeOnly !== false
  const filtered = activeOnly
    ? listResult.data.items.filter((customer) => customer.active)
    : listResult.data.items
  const items = filtered.slice(offset, offset + limit)

  return {
    ok: true,
    data: {
      items,
      total: filtered.length,
      hasMore: offset + items.length < filtered.length
    }
  }
}
