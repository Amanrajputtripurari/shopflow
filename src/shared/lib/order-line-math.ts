import type { OrderLineExtraCharge } from '@shared/types/order'

export interface LinePricingInput {
  qty: number
  rate: number
  discount?: number
  taxPercent: number
  extraCharges?: OrderLineExtraCharge[]
}

export function getLineExtraChargePerUnit(extraCharges?: OrderLineExtraCharge[]): number {
  if (!extraCharges?.length) return 0
  return extraCharges
    .filter((charge) => !charge.includedInPrice)
    .reduce((sum, charge) => sum + charge.amount, 0)
}

export function calculateLineTotal(line: LinePricingInput): number {
  const discount = line.discount ?? 0
  const extraPerUnit = getLineExtraChargePerUnit(line.extraCharges)
  const base = line.qty * line.rate + line.qty * extraPerUnit - discount
  const tax = base * (line.taxPercent / 100)
  return Math.round((base + tax) * 100) / 100
}

export function calculateLineBaseBeforeTax(line: LinePricingInput): number {
  const discount = line.discount ?? 0
  const extraPerUnit = getLineExtraChargePerUnit(line.extraCharges)
  return line.qty * line.rate + line.qty * extraPerUnit - discount
}

export function normalizeExtraCharges(
  extraCharges?: OrderLineExtraCharge[]
): OrderLineExtraCharge[] {
  if (!extraCharges?.length) return []
  return extraCharges
    .map((charge) => ({
      name: charge.name.trim(),
      amount: Math.max(0, charge.amount),
      includedInPrice: charge.includedInPrice
    }))
    .filter((charge) => charge.name.length > 0)
}

export function productExtraChargesToLine(
  extraCharges?: import('@shared/types/product').ProductExtraCharge[]
): OrderLineExtraCharge[] {
  return normalizeExtraCharges(
    extraCharges?.map((charge) => ({
      name: charge.name,
      amount: charge.amount,
      includedInPrice: charge.includedInPrice
    }))
  )
}
