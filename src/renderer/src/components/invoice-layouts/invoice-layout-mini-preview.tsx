import { useMemo } from 'react'

import {
  buildPreviewVariables,
  getSampleLineItems,
  resolveFieldPreviewText
} from '@/lib/invoice-layout-preview'
import { cn } from '@/lib/utils'
import type { InvoiceLayoutField } from '@shared/types/invoice-layout'

interface InvoiceLayoutMiniPreviewProps {
  pageWidth: number
  pageHeight: number
  margin: number
  fields: InvoiceLayoutField[]
  className?: string
}

export function InvoiceLayoutMiniPreview({
  pageWidth,
  pageHeight,
  margin,
  fields,
  className
}: InvoiceLayoutMiniPreviewProps) {
  const scale = 0.16
  const variables = useMemo(() => buildPreviewVariables(), [])
  const lineItems = useMemo(() => getSampleLineItems().slice(0, 2), [])
  const visibleFields = fields.filter((field) => field.visible)

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md border bg-[linear-gradient(45deg,hsl(var(--muted))_25%,transparent_25%,transparent_75%,hsl(var(--muted))_75%,hsl(var(--muted))),linear-gradient(45deg,hsl(var(--muted))_25%,transparent_25%,transparent_75%,hsl(var(--muted))_75%,hsl(var(--muted)))] bg-[length:12px_12px] bg-[position:0_0,6px_6px]',
        className
      )}
    >
      <div className="flex items-center justify-center p-3">
        <div style={{ width: pageWidth * scale, height: pageHeight * scale }}>
          <div
            className="relative origin-top-left bg-white shadow-sm ring-1 ring-border/60"
            style={{
              width: pageWidth,
              height: pageHeight,
              transform: `scale(${scale})`
            }}
          >
            <div
              className="pointer-events-none absolute border border-dashed border-slate-200"
              style={{
                left: margin,
                top: margin,
                width: pageWidth - margin * 2,
                height: pageHeight - margin * 2
              }}
            />

            {visibleFields.map((field) => {
              const previewText = resolveFieldPreviewText(field, variables)
              return (
                <div
                  key={field.id}
                  className="absolute overflow-hidden rounded-[1px] border border-slate-200/80 bg-white/95"
                  style={{
                    left: field.x,
                    top: field.y,
                    width: field.width,
                    height: field.height,
                    fontSize: Math.max(7, field.fontSize - 1),
                    fontWeight: field.fontWeight,
                    textAlign: field.align
                  }}
                >
                  {field.type === 'divider' ? (
                    <div className="flex h-full items-center px-0.5">
                      <div className="h-px w-full bg-slate-300" />
                    </div>
                  ) : field.type === 'line_items' ? (
                    <div className="p-0.5 text-[7px] leading-none">
                      <div className="border-b border-slate-200 font-semibold">Items</div>
                      {lineItems.map((item) => (
                        <div key={item.name} className="truncate border-b border-slate-100 py-px">
                          {item.name}
                        </div>
                      ))}
                    </div>
                  ) : field.type === 'totals' ? (
                    <div className="p-0.5 text-[7px] leading-none">
                      <div>Total ₹{variables['totals.grand']}</div>
                    </div>
                  ) : (
                    <div className="truncate px-0.5 py-px leading-none">{previewText}</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
