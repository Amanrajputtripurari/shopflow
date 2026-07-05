export interface ProductExtraCharge {
  name: string
  amount: number
  /** When true, charge is already part of product price (informational only). */
  includedInPrice: boolean
}

export interface Product {
  id: string
  name: string
  sku: string
  unit: string
  hsnCode: string
  price: number
  taxPercent: number
  extraCharges: ProductExtraCharge[]
  currentStock: number
  trackStock: boolean
  lowStockAlert: number
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface ProductInput {
  name: string
  sku: string
  unit: string
  hsnCode?: string
  price: number
  taxPercent: number
  extraCharges?: ProductExtraCharge[]
  currentStock?: number
  trackStock?: boolean
  lowStockAlert?: number
  active?: boolean
}

export interface ProductListFilters {
  search?: string
  limit?: number
  offset?: number
}

export interface ProductDocument {
  _id: import('mongodb').ObjectId
  name: string
  sku: string
  unit: string
  hsnCode: string
  price: number
  taxPercent: number
  extraCharges: ProductExtraCharge[]
  currentStock: number
  trackStock: boolean
  lowStockAlert: number
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export interface StockAdjustInput {
  productId: string
  quantity: number
  note?: string
}
