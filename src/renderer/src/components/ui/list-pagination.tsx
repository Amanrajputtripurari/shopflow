import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

interface ListPaginationProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
  pageSizeOptions?: number[]
  className?: string
}

function pageRange(page: number, totalPages: number): number[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const pages = new Set<number>([1, totalPages, page, page - 1, page + 1])
  return [...pages].filter((value) => value >= 1 && value <= totalPages).sort((a, b) => a - b)
}

export function ListPagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  className
}: ListPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)
  const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1
  const end = Math.min(safePage * pageSize, total)
  const pages = pageRange(safePage, totalPages)

  if (total === 0) {
    return null
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between',
        className
      )}
    >
      <p className="text-sm text-muted-foreground">
        Showing {start}–{end} of {total}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rows</span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => onPageSizeChange(Number(value))}
            >
              <SelectTrigger className="h-8 w-[72px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            disabled={safePage <= 1}
            onClick={() => onPageChange(safePage - 1)}
          >
            <ChevronLeft className="size-4" />
            <span className="sr-only">Previous page</span>
          </Button>

          {pages.map((pageNumber, index) => {
            const prev = pages[index - 1]
            const showEllipsis = prev !== undefined && pageNumber - prev > 1

            return (
              <span key={pageNumber} className="flex items-center gap-1">
                {showEllipsis && <span className="px-1 text-muted-foreground">…</span>}
                <Button
                  variant={pageNumber === safePage ? 'default' : 'outline'}
                  size="icon"
                  className="size-8 tabular-nums"
                  onClick={() => onPageChange(pageNumber)}
                >
                  {pageNumber}
                </Button>
              </span>
            )
          })}

          <Button
            variant="outline"
            size="icon"
            className="size-8"
            disabled={safePage >= totalPages}
            onClick={() => onPageChange(safePage + 1)}
          >
            <ChevronRight className="size-4" />
            <span className="sr-only">Next page</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
