export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100

export interface PaginationQuery {
  limit?: number
  offset?: number
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  hasMore: boolean
}

export function normalizePagination(
  query: PaginationQuery = {},
  defaultLimit = DEFAULT_PAGE_SIZE
): { limit: number; offset: number } {
  const limit = Math.min(Math.max(query.limit ?? defaultLimit, 1), MAX_PAGE_SIZE)
  const offset = Math.max(query.offset ?? 0, 0)
  return { limit, offset }
}

export function toPaginatedResult<T>(
  items: T[],
  total: number,
  offset: number
): PaginatedResult<T> {
  return {
    items,
    total,
    hasMore: offset + items.length < total
  }
}
