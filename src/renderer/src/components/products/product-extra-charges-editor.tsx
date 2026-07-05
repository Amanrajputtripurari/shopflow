import { Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { NumericInput } from '@/components/ui/numeric-input'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import type { ProductExtraCharge } from '@shared/types/product'
import { MAX_PRODUCT_EXTRA_CHARGES } from '@shared/constants/product'

interface ProductExtraChargesEditorProps {
  value: ProductExtraCharge[]
  disabled?: boolean
  onChange: (next: ProductExtraCharge[]) => void
}

function emptyCharge(): ProductExtraCharge {
  return { name: '', amount: 0, includedInPrice: false }
}

export function ProductExtraChargesEditor({
  value,
  disabled = false,
  onChange
}: ProductExtraChargesEditorProps) {
  const rows = value.length > 0 ? value : [emptyCharge()]

  const updateRow = (index: number, patch: Partial<ProductExtraCharge>) => {
    const next = rows.map((row, i) => (i === index ? { ...row, ...patch } : row))
    onChange(next)
  }

  const removeRow = (index: number) => {
    const next = rows.filter((_, i) => i !== index)
    onChange(next.length > 0 ? next : [emptyCharge()])
  }

  const addRow = () => {
    if (rows.length >= MAX_PRODUCT_EXTRA_CHARGES) return
    onChange([...rows, emptyCharge()])
  }

  const atLimit = rows.length >= MAX_PRODUCT_EXTRA_CHARGES

  return (
    <div className="rounded-lg border px-3 py-2.5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <Label className="text-sm">Extra charges</Label>
          <p className="text-[11px] text-muted-foreground">
            Up to {MAX_PRODUCT_EXTRA_CHARGES} add-ons. Use Included when amount is already in price.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1"
          disabled={disabled || atLimit}
          onClick={addRow}
        >
          <Plus className="size-3.5" />
          Add
        </Button>
      </div>

      <div className="mt-2 space-y-2">
        <div className="hidden gap-3 px-1 text-[11px] font-medium text-muted-foreground sm:grid sm:grid-cols-[minmax(0,1fr)_108px_132px_32px]">
          <span>Charge name</span>
          <span>Amount (₹)</span>
          <span>Included in price</span>
          <span />
        </div>

        {rows.map((row, index) => (
          <div
            key={index}
            className="grid gap-2 rounded-md border bg-muted/20 p-2 sm:grid-cols-[minmax(0,1fr)_108px_132px_32px] sm:items-center sm:gap-3 sm:border-0 sm:bg-transparent sm:p-0"
          >
            <div className="space-y-1 sm:space-y-0">
              <Label htmlFor={`extra-name-${index}`} className="text-xs sm:sr-only">
                Charge name
              </Label>
              <Input
                id={`extra-name-${index}`}
                value={row.name}
                disabled={disabled}
                placeholder="e.g. Packaging"
                className="h-9"
                onChange={(event) => updateRow(index, { name: event.target.value })}
              />
            </div>

            <div className="space-y-1 sm:space-y-0">
              <Label htmlFor={`extra-amount-${index}`} className="text-xs sm:sr-only">
                Amount (₹)
              </Label>
              <NumericInput
                id={`extra-amount-${index}`}
                value={row.amount}
                disabled={disabled}
                className="h-9"
                onNumberChange={(amount) => updateRow(index, { amount })}
              />
            </div>

            <div className="flex items-center justify-between gap-2 sm:justify-end">
              <Label htmlFor={`extra-included-${index}`} className="text-xs sm:sr-only">
                Included in price
              </Label>
              <span className="text-xs text-muted-foreground sm:hidden">Included in price</span>
              <Switch
                id={`extra-included-${index}`}
                checked={row.includedInPrice}
                disabled={disabled}
                onCheckedChange={(includedInPrice) => updateRow(index, { includedInPrice })}
              />
            </div>

            <div className="flex justify-end sm:justify-center">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-destructive"
                disabled={disabled || rows.length <= 1}
                onClick={() => removeRow(index)}
              >
                <Trash2 className="size-4" />
                <span className="sr-only">Remove charge</span>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function sanitizeProductExtraCharges(charges: ProductExtraCharge[]): ProductExtraCharge[] {
  return charges
    .map((charge) => ({
      name: charge.name.trim(),
      amount: Math.max(0, charge.amount),
      includedInPrice: charge.includedInPrice
    }))
    .filter((charge) => charge.name.length > 0)
    .slice(0, MAX_PRODUCT_EXTRA_CHARGES)
}
