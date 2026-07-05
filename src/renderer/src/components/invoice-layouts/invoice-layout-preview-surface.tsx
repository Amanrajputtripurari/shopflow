import { useEffect, useMemo, useRef, useState } from 'react'

import {
  buildPreviewVariables,
  getSampleLineItems,
  resolveFieldPreviewText
} from '@/lib/invoice-layout-preview'
import { cn } from '@/lib/utils'
import type { InvoiceLayoutField } from '@shared/types/invoice-layout'
import type { BillType } from '@shared/types/order'

interface InvoiceLayoutPreviewSurfaceProps {
  pageWidth: number
  pageHeight: number
  margin: number
  fields: InvoiceLayoutField[]
  billType?: BillType
  scale?: number
  autoFit?: boolean
  className?: string
}

export function InvoiceLayoutPreviewSurface({
  pageWidth,
  pageHeight,
  margin,
  fields,
  billType = 'simple',
  scale: scaleProp,
  autoFit = false,
  className
}: InvoiceLayoutPreviewSurfaceProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [fitScale, setFitScale] = useState(0.85)
  const variables = useMemo(() => buildPreviewVariables(billType), [billType])
  const lineItems = useMemo(() => getSampleLineItems(), [])
  const visibleFields = fields.filter((field) => field.visible)
  const scale = scaleProp ?? fitScale

  useEffect(() => {
    if (!autoFit || scaleProp !== undefined) return
    const node = containerRef.current
    if (!node) return

    const updateScale = () => {
      const width = node.clientWidth - 16
      setFitScale(Math.min(1, Math.max(0.35, width / pageWidth)))
    }

    updateScale()
    const observer = new ResizeObserver(updateScale)
    observer.observe(node)
    return () => observer.disconnect()
  }, [autoFit, pageWidth, scaleProp])

  return (
    <div ref={containerRef} className={cn('flex justify-center', className)}>
      <div style={{ width: pageWidth * scale, height: pageHeight * scale }}>
        <div
          className="relative origin-top-left bg-white text-slate-900 shadow-lg ring-1 ring-border/80"
          style={{
            width: pageWidth,
            height: pageHeight,
            transform: `scale(${scale})`
          }}
        >
          <div
            className="pointer-events-none absolute border border-dashed border-slate-300/70"
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
                className="absolute overflow-hidden rounded-sm border border-transparent bg-white"
                style={{
                  left: field.x,
                  top: field.y,
                  width: field.width,
                  height: field.height,
                  fontSize: field.fontSize,
                  fontWeight: field.fontWeight,
                  textAlign: field.align
                }}
              >
                {field.type === 'divider' ? (
                  <div className="flex h-full items-center px-1">
                    <div className="h-px w-full bg-slate-400" />
                  </div>
                ) : field.type === 'line_items' ? (
                  <div className="h-full p-1 text-[9px] leading-tight">
                    <div className="grid grid-cols-[1fr_36px_48px_56px] gap-1 border-b border-slate-300 pb-1 font-semibold">
                      <span>Item</span>
                      <span className="text-right">Qty</span>
                      <span className="text-right">Rate</span>
                      <span className="text-right">Amount</span>
                    </div>
                    {lineItems.map((item) => (
                      <div
                        key={item.name}
                        className="grid grid-cols-[1fr_36px_48px_56px] gap-1 border-b border-slate-100 py-0.5"
                      >
                        <span className="truncate">{item.name}</span>
                        <span className="text-right">{item.qty}</span>
                        <span className="text-right">{item.rate}</span>
                        <span className="text-right">{item.amount}</span>
                      </div>
                    ))}
                  </div>
                ) : field.type === 'totals' ? (
                  <div className="flex h-full flex-col justify-start gap-0.5 p-1 text-[9px]">
                    <div className="flex justify-between gap-2">
                      <span>Subtotal</span>
                      <span>₹{variables['totals.subtotal']}</span>
                    </div>
                    {Number(variables['totals.discount']) > 0 && (
                      <div className="flex justify-between gap-2">
                        <span>Discount</span>
                        <span>₹{variables['totals.discount']}</span>
                      </div>
                    )}
                    <div className="flex justify-between gap-2">
                      <span>Tax</span>
                      <span>₹{variables['totals.tax']}</span>
                    </div>
                    {Number(variables['totals.extra']) > 0 && (
                      <div className="flex justify-between gap-2">
                        <span>Delivery</span>
                        <span>₹{variables['totals.extra']}</span>
                      </div>
                    )}
                    <div className="mt-1 flex justify-between gap-2 border-t border-slate-300 pt-1 font-semibold">
                      <span>Grand total</span>
                      <span>₹{variables['totals.grand']}</span>
                    </div>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap p-1 leading-snug">{previewText}</div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
