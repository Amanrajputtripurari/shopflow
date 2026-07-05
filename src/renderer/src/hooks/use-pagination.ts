import { useCallback, useEffect, useMemo, useState } from 'react'

import { DEFAULT_PAGE_SIZE } from '@shared/types/pagination'

export function usePagination(initialPageSize = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialPageSize)

  const offset = useMemo(() => (page - 1) * pageSize, [page, pageSize])

  const resetPage = useCallback(() => setPage(1), [])

  const onPageSizeChange = useCallback((size: number) => {
    setPageSize(size)
    setPage(1)
  }, [])

  return {
    page,
    pageSize,
    offset,
    setPage,
    setPageSize: onPageSizeChange,
    resetPage
  }
}

/** Reset to page 1 when filter dependencies change. */
export function useResetPagination(resetPage: () => void, deps: unknown[]) {
  useEffect(() => {
    resetPage()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when filters change
  }, deps)
}
