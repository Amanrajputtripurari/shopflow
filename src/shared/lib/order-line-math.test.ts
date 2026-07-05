import { describe, expect, it } from 'vitest'

import {
  calculateLineBaseBeforeTax,
  calculateLineTotal,
  getLineExtraChargePerUnit,
  normalizeExtraCharges,
  productExtraChargesToLine
} from './order-line-math'

describe('order-line-math', () => {
  it('calculates line total with tax and extra charges', () => {
    const total = calculateLineTotal({
      qty: 2,
      rate: 100,
      discount: 10,
      taxPercent: 5,
      extraCharges: [{ name: 'Packaging', amount: 5, includedInPrice: false }]
    })

    expect(total).toBe(210)
  })

  it('ignores extra charges included in price', () => {
    expect(
      getLineExtraChargePerUnit([{ name: 'Hidden', amount: 20, includedInPrice: true }])
    ).toBe(0)
  })

  it('calculates base before tax', () => {
    expect(
      calculateLineBaseBeforeTax({
        qty: 3,
        rate: 50,
        discount: 0,
        taxPercent: 18
      })
    ).toBe(150)
  })

  it('normalizes extra charge names and drops empty rows', () => {
    expect(
      normalizeExtraCharges([
        { name: '  Delivery ', amount: -5, includedInPrice: false },
        { name: '   ', amount: 10, includedInPrice: false }
      ])
    ).toEqual([{ name: 'Delivery', amount: 0, includedInPrice: false }])
  })

  it('maps product extra charges to order line charges', () => {
    expect(
      productExtraChargesToLine([{ name: 'Gift wrap', amount: 15, includedInPrice: false }])
    ).toEqual([{ name: 'Gift wrap', amount: 15, includedInPrice: false }])
  })
})
