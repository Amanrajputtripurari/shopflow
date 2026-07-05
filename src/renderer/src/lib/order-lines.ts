import { calculateLineTotal as computeLineTotal, productExtraChargesToLine } from '@shared/lib/order-line-math'
import type { OrderLineInput } from '@shared/types/order'
import type { Product } from '@shared/types/product'

export function productToLine(product: Product, qty = 1): OrderLineInput {
  return {
    productId: product.id,
    nameSnapshot: product.name,
    skuSnapshot: product.sku,
    unitSnapshot: product.unit,
    hsnSnapshot: product.hsnCode,
    qty,
    rate: product.price,
    discount: 0,
    taxPercent: product.taxPercent,
    extraCharges: productExtraChargesToLine(product.extraCharges)
  }
}

/** Adds product or bumps qty if the same SKU is already in the cart. */
export function addProductToLines(lines: OrderLineInput[], product: Product): OrderLineInput[] {
  const index = lines.findIndex((line) => line.productId === product.id)
  if (index >= 0) {
    return lines.map((line, i) => (i === index ? { ...line, qty: line.qty + 1 } : line))
  }
  return [...lines, productToLine(product)]
}

export function calcLineTotal(line: OrderLineInput): number {
  return computeLineTotal(line)
}

export function calcOrderTotal(lines: OrderLineInput[], deliveryCharge = 0): number {
  const itemsTotal = lines.reduce((sum, line) => sum + calcLineTotal(line), 0)
  return Math.round((itemsTotal + deliveryCharge) * 100) / 100
}

export function filterProducts(products: Product[], query: string): Product[] {
  const term = query.trim().toLowerCase()
  if (!term) return products
  return products.filter(
    (product) =>
      product.name.toLowerCase().includes(term) || product.sku.toLowerCase().includes(term)
  )
}

export function findProductByQuery(products: Product[], query: string): Product | undefined {
  const term = query.trim().toLowerCase()
  if (!term) return undefined

  const exactSku = products.find((product) => product.sku.toLowerCase() === term)
  if (exactSku) return exactSku

  return filterProducts(products, query)[0]
}

export function updateLineQty(lines: OrderLineInput[], index: number, delta: number): OrderLineInput[] {
  return lines
    .map((line, i) => (i === index ? { ...line, qty: line.qty + delta } : line))
    .filter((line) => line.qty > 0)
}

export function formatExtraChargeLabel(charge: {
  name: string
  amount: number
  includedInPrice: boolean
}): string {
  const amount = `₹${charge.amount}`
  if (charge.includedInPrice) {
    return `${charge.name} ${amount} (included in price)`
  }
  return `+ ${charge.name} ${amount}`
}
