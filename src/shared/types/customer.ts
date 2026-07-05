export interface Customer {
  id: string
  name: string
  phone: string
  address: string
  gstin: string
  tags: string[]
  creditBalance: number
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface CustomerInput {
  name: string
  phone?: string
  address?: string
  gstin?: string
  tags?: string[]
  active?: boolean
}

export interface CustomerSearchQuery {
  search?: string
  limit?: number
  offset?: number
  activeOnly?: boolean
}

export interface CustomerSearchResult {
  items: Customer[]
  total: number
  hasMore: boolean
}

export interface CustomerListFilters {
  search?: string
  limit?: number
  offset?: number
}

export interface CustomerDocument {
  _id: import('mongodb').ObjectId
  name: string
  phone: string
  address: string
  gstin: string
  tags: string[]
  creditBalance: number
  active: boolean
  createdAt: Date
  updatedAt: Date
}
