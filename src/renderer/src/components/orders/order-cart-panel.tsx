import { Loader2, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { calcLineTotal, formatExtraChargeLabel } from '@/lib/order-lines'
import { formatCurrency } from '@/lib/format'
import type { OrderLineInput } from '@shared/types/order'

interface OrderCartPanelProps {
  lines: OrderLineInput[]
  notes: string
  total: number
  saving: boolean
  onNotesChange: (notes: string) => void
  onQtyChange: (index: number, delta: number) => void
  onRemoveLine: (index: number) => void
  onCreate: (andNext: boolean) => void
  canSubmit: boolean
}

export function OrderCartPanel({
  lines,
  notes,
  total,
  saving,
  onNotesChange,
  onQtyChange,
  onRemoveLine,
  onCreate,
  canSubmit
}: OrderCartPanelProps) {
  const itemCount = lines.reduce((sum, line) => sum + line.qty, 0)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold">Cart</h3>
          <p className="text-xs text-muted-foreground">{itemCount} item{itemCount === 1 ? '' : 's'}</p>
        </div>
        {itemCount > 0 && (
          <Badge variant="secondary" className="tabular-nums">
            {itemCount} pcs
          </Badge>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
        {lines.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-4 py-8 text-center">
            <ShoppingBag className="mb-2 size-9 text-muted-foreground/40" strokeWidth={1.5} />
            <p className="text-sm font-medium">Cart is empty</p>
            <p className="mt-1 text-xs text-muted-foreground">Tap products to add them here</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {lines.map((line, index) => (
              <li
                key={`${line.productId ?? line.nameSnapshot}-${index}`}
                className="rounded-lg border bg-background p-3"
              >
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium leading-tight">{line.nameSnapshot}</p>
                    <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                      {formatCurrency(line.rate)} each
                    </p>
                    {(line.extraCharges ?? []).map((charge, chargeIndex) => (
                      <p key={chargeIndex} className="mt-0.5 text-[11px] text-muted-foreground">
                        {formatExtraChargeLabel(charge)}
                      </p>
                    ))}
                  </div>
                  <p className="shrink-0 text-sm font-semibold tabular-nums">
                    {formatCurrency(calcLineTotal(line))}
                  </p>
                </div>

                <div className="mt-2.5 flex items-center justify-between">
                  <div className="inline-flex items-center rounded-md border">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 rounded-none rounded-l-md border-r"
                      onClick={() => onQtyChange(index, -1)}
                    >
                      <Minus className="size-3.5" />
                      <span className="sr-only">Decrease quantity</span>
                    </Button>
                    <span className="flex h-7 min-w-8 items-center justify-center px-1 text-sm font-medium tabular-nums">
                      {line.qty}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 rounded-none rounded-r-md border-l"
                      onClick={() => onQtyChange(index, 1)}
                    >
                      <Plus className="size-3.5" />
                      <span className="sr-only">Increase quantity</span>
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-destructive"
                    onClick={() => onRemoveLine(index)}
                  >
                    <Trash2 className="size-3.5" />
                    <span className="sr-only">Remove item</span>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="shrink-0 space-y-3 border-t bg-muted/20 p-4">
        <div className="space-y-1.5">
          <Label htmlFor="order-notes" className="text-xs text-muted-foreground">
            Notes (optional)
          </Label>
          <Input
            id="order-notes"
            value={notes}
            onChange={(event) => onNotesChange(event.target.value)}
            placeholder="Add a note…"
            className="h-9 bg-background"
          />
        </div>

        <Separator />

        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-xl font-bold tabular-nums tracking-tight">{formatCurrency(total)}</p>
          </div>
        </div>

        <div className="grid gap-2">
          <Button className="h-10 w-full" disabled={!canSubmit || saving} onClick={() => onCreate(false)}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Create order
            <kbd className="ml-auto hidden rounded bg-primary-foreground/20 px-1.5 py-0.5 text-[10px] font-normal sm:inline">
              ⌘↵
            </kbd>
          </Button>
          <Button
            variant="outline"
            className="h-10 w-full"
            disabled={!canSubmit || saving}
            onClick={() => onCreate(true)}
          >
            Create & next
          </Button>
        </div>
      </div>
    </div>
  )
}
