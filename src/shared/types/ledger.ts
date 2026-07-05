export type LedgerEntryType = 'debit' | 'credit'

export interface LedgerEntry {
  id: string
  customerId: string
  customerName: string
  orderId: string | null
  orderNo: string | null
  type: LedgerEntryType
  amount: number
  note: string
  createdBy: string
  createdByName: string
  createdAt: string
}

export interface LedgerEntryDocument {
  _id: import('mongodb').ObjectId
  customerId: import('mongodb').ObjectId
  customerName: string
  orderId: import('mongodb').ObjectId | null
  orderNo: string | null
  type: LedgerEntryType
  amount: number
  note: string
  createdBy: import('mongodb').ObjectId
  createdByName: string
  createdAt: Date
}

export interface RecordPaymentInput {
  orderId: string
  paidAmount: number
  creditAmount: number
  paymentMode: import('./order').PaymentMode
  note?: string
}

export interface SettleCreditInput {
  customerId: string
  amount: number
  note?: string
}
