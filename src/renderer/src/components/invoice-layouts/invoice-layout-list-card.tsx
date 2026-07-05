import { Copy, Eye, MoreHorizontal, Pencil, Star, Trash2 } from 'lucide-react'

import { InvoiceLayoutMiniPreview } from '@/components/invoice-layouts/invoice-layout-mini-preview'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import type { InvoiceLayout } from '@shared/types/invoice-layout'

interface InvoiceLayoutListCardProps {
  layout: InvoiceLayout
  isAdmin: boolean
  onEdit: (layout: InvoiceLayout) => void
  onPreview: (layout: InvoiceLayout) => void
  onDuplicate: (layout: InvoiceLayout) => void
  onDelete: (layout: InvoiceLayout) => void
}

export function InvoiceLayoutListCard({
  layout,
  isAdmin,
  onEdit,
  onPreview,
  onDuplicate,
  onDelete
}: InvoiceLayoutListCardProps) {
  return (
    <Card className="group overflow-hidden transition-shadow hover:shadow-md">
      <InvoiceLayoutMiniPreview
        pageWidth={layout.pageWidth}
        pageHeight={layout.pageHeight}
        margin={layout.margin}
        fields={layout.fields}
        className="border-b border-x-0 border-t-0 rounded-none"
      />

      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-base font-semibold">{layout.name}</h3>
              {layout.isDefault && (
                <Badge variant="secondary" className="gap-1 shrink-0">
                  <Star className="size-3 fill-current" />
                  Default
                </Badge>
              )}
            </div>
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {layout.description || 'No description provided.'}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8 shrink-0">
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Layout actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onPreview(layout)}>
                <Eye className="size-4" />
                Preview with demo data
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(layout)}>
                {isAdmin ? (
                  <>
                    <Pencil className="size-4" />
                    Edit layout
                  </>
                ) : (
                  <>
                    <Eye className="size-4" />
                    View layout
                  </>
                )}
              </DropdownMenuItem>
              {isAdmin && (
                <>
                  <DropdownMenuItem onClick={() => onDuplicate(layout)}>
                    <Copy className="size-4" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => onDelete(layout)}
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {layout.billTypes.map((billType) => (
            <Badge key={billType} variant="outline" className="text-[11px]">
              {billType === 'gst' ? 'GST' : 'Simple'}
            </Badge>
          ))}
          <Badge variant="outline" className="text-[11px]">
            {layout.fields.length} fields
          </Badge>
          <Badge variant="outline" className="text-[11px]">
            A4
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" className="gap-2" size="sm" onClick={() => onPreview(layout)}>
            <Eye className="size-4" />
            Preview
          </Button>
          <Button type="button" className="gap-2" size="sm" onClick={() => onEdit(layout)}>
            {isAdmin ? <Pencil className="size-4" /> : <Eye className="size-4" />}
            {isAdmin ? 'Edit' : 'View'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
