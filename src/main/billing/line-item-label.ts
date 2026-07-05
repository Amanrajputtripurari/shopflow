import type { OrderLine } from '@shared/types/order'
import { formatCurrencyInr } from '../helpers/format'

export function formatBillLineItemLabel(line: OrderLine): string {
  const extras = line.extraCharges ?? []
  if (!extras.length) return line.nameSnapshot

  const parts = extras.map((charge) => {
    const amount = formatCurrencyInr(charge.amount)
    if (charge.includedInPrice) {
      return `${charge.name}: ${amount} (incl.)`
    }
    return `+ ${charge.name}: ${amount}`
  })

  return `${line.nameSnapshot}\n${parts.join('\n')}`
}
