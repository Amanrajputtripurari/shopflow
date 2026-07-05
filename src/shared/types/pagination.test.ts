import { describe, expect, it } from 'vitest'

import { normalizePagination, toPaginatedResult } from './pagination'

describe('pagination', () => {
  it('normalizes limit and offset with defaults', () => {
    expect(normalizePagination({})).toEqual({ limit: 20, offset: 0 })
  })

  it('caps limit at max page size', () => {
    expect(normalizePagination({ limit: 500 })).toEqual({ limit: 100, offset: 0 })
  })

  it('builds paginated result with hasMore flag', () => {
    expect(toPaginatedResult(['a', 'b'], 10, 0)).toEqual({
      items: ['a', 'b'],
      total: 10,
      hasMore: true
    })
  })

  it('marks last page when no more items remain', () => {
    expect(toPaginatedResult(['a'], 1, 0)).toEqual({
      items: ['a'],
      total: 1,
      hasMore: false
    })
  })
})
