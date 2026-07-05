import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Grid3X3, Maximize2, ZoomIn, ZoomOut } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { INVOICE_FIELD_META } from '@/lib/invoice-layout-field-meta'
import {
  buildPreviewVariables,
  getSampleLineItems,
  resolveFieldPreviewText
} from '@/lib/invoice-layout-preview'
import { clampFieldToPage } from '@/lib/invoice-layout-utils'
import { cn } from '@/lib/utils'
import type { InvoiceLayoutField } from '@shared/types/invoice-layout'

interface InvoiceLayoutCanvasProps {
  pageWidth: number
  pageHeight: number
  margin: number
  fields: InvoiceLayoutField[]
  selectedFieldId: string | null
  readOnly?: boolean
  onSelectField: (id: string | null) => void
  onUpdateField: (id: string, patch: Partial<InvoiceLayoutField>) => void
}

interface DragState {
  fieldId: string
  startX: number
  startY: number
  originX: number
  originY: number
}

interface ResizeState {
  fieldId: string
  startX: number
  startY: number
  originWidth: number
  originHeight: number
}

const SNAP = 8

function snap(value: number): number {
  return Math.round(value / SNAP) * SNAP
}

export function InvoiceLayoutCanvas({
  pageWidth,
  pageHeight,
  margin,
  fields,
  selectedFieldId,
  readOnly = false,
  onSelectField,
  onUpdateField
}: InvoiceLayoutCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [fitScale, setFitScale] = useState(0.72)
  const [zoom, setZoom] = useState(1)
  const [showGrid, setShowGrid] = useState(true)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [resize, setResize] = useState<ResizeState | null>(null)
  const variables = useMemo(() => buildPreviewVariables(), [])
  const lineItems = useMemo(() => getSampleLineItems(), [])
  const scale = fitScale * zoom

  useEffect(() => {
    const node = containerRef.current
    if (!node) return

    const updateScale = () => {
      const width = node.clientWidth - 48
      const height = node.clientHeight - 48
      const byWidth = width / pageWidth
      const byHeight = height / pageHeight
      const next = Math.min(1, Math.max(0.4, Math.min(byWidth, byHeight)))
      setFitScale(next)
    }

    updateScale()
    const observer = new ResizeObserver(updateScale)
    observer.observe(node)
    return () => observer.disconnect()
  }, [pageWidth, pageHeight])

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (drag) {
        const deltaX = (event.clientX - drag.startX) / scale
        const deltaY = (event.clientY - drag.startY) / scale
        const field = fields.find((item) => item.id === drag.fieldId)
        if (!field) return

        const next = clampFieldToPage(
          {
            ...field,
            x: snap(drag.originX + deltaX),
            y: snap(drag.originY + deltaY)
          },
          pageWidth,
          pageHeight
        )
        onUpdateField(drag.fieldId, { x: next.x, y: next.y })
        return
      }

      if (resize) {
        const deltaX = (event.clientX - resize.startX) / scale
        const deltaY = (event.clientY - resize.startY) / scale
        const field = fields.find((item) => item.id === resize.fieldId)
        if (!field) return

        const next = clampFieldToPage(
          {
            ...field,
            width: snap(Math.max(24, resize.originWidth + deltaX)),
            height: snap(Math.max(12, resize.originHeight + deltaY))
          },
          pageWidth,
          pageHeight
        )
        onUpdateField(resize.fieldId, { width: next.width, height: next.height })
      }
    },
    [drag, resize, fields, onUpdateField, pageHeight, pageWidth, scale]
  )

  const handlePointerUp = useCallback(() => {
    setDrag(null)
    setResize(null)
  }, [])

  useEffect(() => {
    if (!drag && !resize) return
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [drag, resize, handlePointerMove, handlePointerUp])

  const startDrag = (field: InvoiceLayoutField, event: React.PointerEvent) => {
    if (readOnly) return
    event.stopPropagation()
    onSelectField(field.id)
    setDrag({
      fieldId: field.id,
      startX: event.clientX,
      startY: event.clientY,
      originX: field.x,
      originY: field.y
    })
  }

  const startResize = (field: InvoiceLayoutField, event: React.PointerEvent) => {
    if (readOnly) return
    event.stopPropagation()
    setResize({
      fieldId: field.id,
      startX: event.clientX,
      startY: event.clientY,
      originWidth: field.width,
      originHeight: field.height
    })
  }

  const selectedField = fields.find((field) => field.id === selectedFieldId)

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">A4 preview</span>
          <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] tabular-nums text-muted-foreground">
            {pageWidth} × {pageHeight} pt
          </span>
          {selectedField && (
            <span className="hidden rounded-md border px-2 py-0.5 text-[11px] text-muted-foreground sm:inline">
              {selectedField.label} · x{selectedField.x} y{selectedField.y}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant={showGrid ? 'secondary' : 'ghost'}
            size="icon"
            className="size-8"
            onClick={() => setShowGrid((current) => !current)}
            title="Toggle grid"
          >
            <Grid3X3 className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            disabled={zoom <= 0.6}
            onClick={() => setZoom((current) => Math.max(0.6, Number((current - 0.1).toFixed(1))))}
          >
            <ZoomOut className="size-4" />
          </Button>
          <span className="min-w-12 text-center text-xs tabular-nums text-muted-foreground">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            disabled={zoom >= 1.6}
            onClick={() => setZoom((current) => Math.min(1.6, Number((current + 0.1).toFixed(1))))}
          >
            <ZoomIn className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => setZoom(1)}
            title="Reset zoom"
          >
            <Maximize2 className="size-4" />
          </Button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative min-h-0 flex-1 overflow-auto bg-[linear-gradient(45deg,hsl(var(--muted)/0.55)_25%,transparent_25%,transparent_75%,hsl(var(--muted)/0.55)_75%,hsl(var(--muted)/0.55)),linear-gradient(45deg,hsl(var(--muted)/0.55)_25%,transparent_25%,transparent_75%,hsl(var(--muted)/0.55)_75%,hsl(var(--muted)/0.55))] bg-[length:16px_16px] bg-[position:0_0,8px_8px] p-6"
      >
        <div className="mx-auto" style={{ width: pageWidth * scale, height: pageHeight * scale }}>
          <div
            className="relative origin-top-left bg-white text-slate-900 shadow-xl ring-1 ring-border/80"
            style={{
              width: pageWidth,
              height: pageHeight,
              transform: `scale(${scale})`
            }}
            onPointerDown={() => onSelectField(null)}
          >
            {showGrid && (
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.35]"
                style={{
                  backgroundImage:
                    'linear-gradient(to right, rgb(148 163 184 / 0.25) 1px, transparent 1px), linear-gradient(to bottom, rgb(148 163 184 / 0.25) 1px, transparent 1px)',
                  backgroundSize: `${SNAP}px ${SNAP}px`
                }}
              />
            )}

            <div
              className="pointer-events-none absolute border border-dashed border-primary/30 bg-primary/[0.02]"
              style={{
                left: margin,
                top: margin,
                width: pageWidth - margin * 2,
                height: pageHeight - margin * 2
              }}
            />

            {fields.map((field) => {
              if (!field.visible) return null
              const selected = field.id === selectedFieldId
              const previewText = resolveFieldPreviewText(field, variables)
              const meta = INVOICE_FIELD_META[field.type]

              return (
                <div
                  key={field.id}
                  className={cn(
                    'absolute overflow-hidden rounded-sm border bg-white/95 transition-shadow',
                    selected
                      ? 'border-primary shadow-md ring-2 ring-primary/25'
                      : 'border-slate-300/80 hover:border-slate-400',
                    readOnly ? 'cursor-default' : 'cursor-move'
                  )}
                  style={{
                    left: field.x,
                    top: field.y,
                    width: field.width,
                    height: field.height,
                    fontSize: field.fontSize,
                    fontWeight: field.fontWeight,
                    textAlign: field.align
                  }}
                  onPointerDown={(event) => startDrag(field, event)}
                >
                  <div
                    className={cn(
                      'pointer-events-none absolute left-1 top-1 rounded px-1 py-px text-[8px] font-medium',
                      meta.badgeClass
                    )}
                  >
                    {meta.shortLabel}
                  </div>

                  {field.type === 'divider' ? (
                    <div className="flex h-full items-center px-1">
                      <div className="h-px w-full bg-slate-400" />
                    </div>
                  ) : field.type === 'line_items' ? (
                    <div className="h-full p-1 pt-4 text-[9px] leading-tight">
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
                    <div className="flex h-full flex-col justify-start gap-0.5 p-1 pt-4 text-[9px]">
                      <div className="flex justify-between gap-2">
                        <span>Subtotal</span>
                        <span>₹{variables['totals.subtotal']}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span>Tax</span>
                        <span>₹{variables['totals.tax']}</span>
                      </div>
                      <div className="mt-1 flex justify-between gap-2 border-t border-slate-300 pt-1 font-semibold">
                        <span>Grand total</span>
                        <span>₹{variables['totals.grand']}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap p-1 pt-4 leading-snug">{previewText}</div>
                  )}

                  {selected && !readOnly && (
                    <>
                      <div className="pointer-events-none absolute -top-6 left-0 flex items-center gap-1">
                        <span className="rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                          {field.label}
                        </span>
                      </div>
                      <div
                        className="absolute bottom-0 right-0 size-3 translate-x-1/2 translate-y-1/2 cursor-se-resize rounded-sm border-2 border-primary bg-background"
                        onPointerDown={(event) => startResize(field, event)}
                      />
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {!readOnly && (
        <div className="border-t px-3 py-2 text-[11px] text-muted-foreground">
          Drag to move · corner handle to resize · {SNAP}px snap grid
        </div>
      )}
    </div>
  )
}
