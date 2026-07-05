export type ExpensePaymentMode = 'cash' | 'upi' | 'card' | 'bank' | 'other'

export interface ExpenseCategory {
  id: string
  name: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface ExpenseCategoryInput {
  name: string
  active?: boolean
}

export interface Expense {
  id: string
  date: string
  amount: number
  categoryId: string | null
  categoryName: string
  customCategory: boolean
  paymentMode: ExpensePaymentMode
  note: string
  receiptRef: string
  createdBy: string
  createdByName: string
  createdAt: string
  updatedAt: string
}

export interface ExpenseInput {
  date: string
  amount: number
  categoryId?: string | null
  customCategoryName?: string
  saveCustomAsPreset?: boolean
  paymentMode: ExpensePaymentMode
  note?: string
  receiptRef?: string
}

export interface ExpenseListFilters {
  from?: string
  to?: string
  categoryId?: string
  search?: string
  limit?: number
  offset?: number
}

export interface ExpenseListResult {
  items: Expense[]
  total: number
  hasMore: boolean
  totalAmount: number
}

export interface ExpenseCategoryDocument {
  _id: import('mongodb').ObjectId
  name: string
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ExpenseDocument {
  _id: import('mongodb').ObjectId
  date: Date
  amount: number
  categoryId: import('mongodb').ObjectId | null
  categoryName: string
  customCategory: boolean
  paymentMode: ExpensePaymentMode
  note: string
  receiptRef: string
  createdBy: import('mongodb').ObjectId
  createdByName: string
  createdAt: Date
  updatedAt: Date
}
