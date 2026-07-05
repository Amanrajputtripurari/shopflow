import { useEffect, useMemo, useState } from 'react'
import { FileText, Info } from 'lucide-react'

import { InvoiceLayoutPreviewSurface } from '@/components/invoice-layouts/invoice-layout-preview-surface'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { buildPreviewVariables } from '@/lib/invoice-layout-preview'
import { cn } from '@/lib/utils'
import { INVOICE_LAYOUT_VARIABLES } from '@shared/constants/invoice-layout'
import type { InvoiceLayoutField } from '@shared/types/invoice-layout'
import type { BillType } from '@shared/types/order'

export interface InvoiceLayoutPreviewTarget {
  name: string
  pageWidth: number
  pageHeight: number
  margin: number
  fields: InvoiceLayoutField[]
  billTypes?: BillType[]
}

interface InvoiceLayoutPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  layout: InvoiceLayoutPreviewTarget | null
}

const DEMO_HIGHLIGHTS = [
  { label: 'Company', value: 'My Shop' },
  { label: 'Customer', value: 'Rahul Sharma' },
  { label: 'Invoice', value: 'INV-2026-001' },
  { label: 'Order', value: 'ORD-1042' }
]

export function InvoiceLayoutPreviewDialog({
  open,
  onOpenChange,
  layout
}: InvoiceLayoutPreviewDialogProps) {
  const defaultBillType = layout?.billTypes?.includes('simple')
    ? 'simple'
    : layout?.billTypes?.[0] ?? 'simple'
  const [billType, setBillType] = useState<BillType>(defaultBillType)

  useEffect(() => {
    if (layout) setBillType(defaultBillType)
  }, [layout, defaultBillType])

  const activeBillType = useMemo(() => {
    if (!layout?.billTypes?.length) return billType
    return layout.billTypes.includes(billType) ? billType : layout.billTypes[0]
  }, [billType, layout?.billTypes])

  const variables = useMemo(() => buildPreviewVariables(activeBillType), [activeBillType])

  if (!layout) return null

  const showBillTypeToggle = (layout.billTypes?.length ?? 0) > 1

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] max-w-5xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 space-y-3 border-b px-6 py-4 text-left">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <DialogTitle className="flex items-center gap-2">
                <FileText className="size-5 text-muted-foreground" />
                Preview — {layout.name}
              </DialogTitle>
              <DialogDescription>
                Sample bill with demo customer, products, and totals. Real orders will use live data.
              </DialogDescription>
            </div>
            <Badge variant="secondary" className="gap-1">
              <Info className="size-3.5" />
              Demo data
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {showBillTypeToggle ? (
              (['simple', 'gst'] as BillType[]).map((type) => {
                if (!layout.billTypes?.includes(type)) return null
                return (
                  <Button
                    key={type}
                    type="button"
                    size="sm"
                    variant={activeBillType === type ? 'default' : 'outline'}
                    onClick={() => setBillType(type)}
                  >
                    {type === 'gst' ? 'GST invoice' : 'Simple bill'}
                  </Button>
                )
              })
            ) : (
              <Badge variant="outline">
                {activeBillType === 'gst' ? 'GST invoice preview' : 'Simple bill preview'}
              </Badge>
            )}
            <Badge variant="outline">{layout.fields.filter((f) => f.visible).length} visible fields</Badge>
          </div>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="hidden shrink-0 border-r bg-muted/20 p-4 lg:block">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Demo values
            </p>
            <div className="space-y-2">
              {DEMO_HIGHLIGHTS.map((item) => (
                <div key={item.label} className="rounded-md border bg-background px-2.5 py-2">
                  <p className="text-[10px] text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-medium">{item.value}</p>
                </div>
              ))}
              <div className="rounded-md border bg-background px-2.5 py-2">
                <p className="text-[10px] text-muted-foreground">Grand total</p>
                <p className="text-sm font-semibold tabular-nums">₹{variables['totals.grand']}</p>
              </div>
            </div>
            <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
              {INVOICE_LAYOUT_VARIABLES.length} variables available in layouts. Use {'{invoice.number}'} style
              placeholders in text blocks.
            </p>
          </aside>

          <div
            className={cn(
              'min-h-0 overflow-y-auto overscroll-y-contain p-6',
              'bg-[linear-gradient(45deg,hsl(var(--muted)/0.45)_25%,transparent_25%,transparent_75%,hsl(var(--muted)/0.45)_75%,hsl(var(--muted)/0.45)),linear-gradient(45deg,hsl(var(--muted)/0.45)_25%,transparent_25%,transparent_75%,hsl(var(--muted)/0.45)_75%,hsl(var(--muted)/0.45))] bg-[length:16px_16px] bg-[position:0_0,8px_8px]'
            )}
          >
            <InvoiceLayoutPreviewSurface
              pageWidth={layout.pageWidth}
              pageHeight={layout.pageHeight}
              margin={layout.margin}
              fields={layout.fields}
              billType={activeBillType}
              autoFit
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function layoutInputToPreviewTarget(
  input: import('@shared/types/invoice-layout').InvoiceLayoutInput
): InvoiceLayoutPreviewTarget {
  return {
    name: input.name.trim() || 'Untitled layout',
    pageWidth: input.pageWidth ?? 595,
    pageHeight: input.pageHeight ?? 842,
    margin: input.margin ?? 50,
    fields: input.fields,
    billTypes: [...input.billTypes]
  }
}

export function layoutToPreviewTarget(
  layout: import('@shared/types/invoice-layout').InvoiceLayout
): InvoiceLayoutPreviewTarget {
  return {
    name: layout.name,
    pageWidth: layout.pageWidth,
    pageHeight: layout.pageHeight,
    margin: layout.margin,
    fields: layout.fields,
    billTypes: [...layout.billTypes]
  }
}
