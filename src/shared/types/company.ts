export type BillType = 'simple' | 'gst'

export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'credit'

export type BillingStatus = 'none' | 'billed'

export type PaymentMode = 'cash' | 'upi' | 'bank' | 'mixed'

export type StockDeductOn = 'confirm' | 'bill'

export interface BillingSeries {
  simplePrefix: string
  simpleNext: number
  gstPrefix: string
  gstNext: number
}

export interface StockSettings {
  stockTrackingEnabled: boolean
  stockDeductOn: StockDeductOn
  allowNegativeStock: boolean
}

export interface CompanyProfile {
  name: string
  gstin: string
  address: string
  phone: string
  defaultBillType: BillType
  billingSeries: BillingSeries
  stockSettings: StockSettings
}

export interface CompanyInput {
  name?: string
  gstin?: string
  address?: string
  phone?: string
  defaultBillType?: BillType
  billingSeries?: Partial<BillingSeries>
  stockSettings?: Partial<StockSettings>
}

export interface CompanyDocument {
  _id: typeof import('../constants/database').COMPANY_ID
  name: string
  gstin: string
  address: string
  phone: string
  defaultBillType: BillType
  simplePrefix: string
  simpleNext: number
  gstPrefix: string
  gstNext: number
  stockTrackingEnabled: boolean
  stockDeductOn: StockDeductOn
  allowNegativeStock: boolean
  updatedAt: Date
}

export const DEFAULT_BILLING_SERIES: BillingSeries = {
  simplePrefix: 'BILL',
  simpleNext: 1,
  gstPrefix: 'INV',
  gstNext: 1
}

export const DEFAULT_STOCK_SETTINGS: StockSettings = {
  stockTrackingEnabled: false,
  stockDeductOn: 'confirm',
  allowNegativeStock: false
}
