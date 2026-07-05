import type { BillType } from '@shared/types/order'

export type InvoiceLayoutFieldType =
  | 'text'
  | 'variable'
  | 'line_items'
  | 'totals'
  | 'divider'

export type InvoiceLayoutAlign = 'left' | 'center' | 'right'

export interface InvoiceLayoutField {
  id: string
  type: InvoiceLayoutFieldType
  label: string
  /** Static text or variable key e.g. company.name */
  content: string
  x: number
  y: number
  width: number
  height: number
  fontSize: number
  fontWeight: 'normal' | 'bold'
  align: InvoiceLayoutAlign
  visible: boolean
}

export interface InvoiceLayout {
  id: string
  name: string
  description: string
  billTypes: BillType[]
  isDefault: boolean
  pageWidth: number
  pageHeight: number
  margin: number
  fields: InvoiceLayoutField[]
  createdAt: string
  updatedAt: string
}

export interface InvoiceLayoutInput {
  name: string
  description?: string
  billTypes: BillType[]
  isDefault?: boolean
  pageWidth?: number
  pageHeight?: number
  margin?: number
  fields: InvoiceLayoutField[]
}

export interface InvoiceLayoutDocument {
  _id: import('mongodb').ObjectId
  name: string
  description: string
  billTypes: BillType[]
  isDefault: boolean
  pageWidth: number
  pageHeight: number
  margin: number
  fields: InvoiceLayoutField[]
  createdAt: Date
  updatedAt: Date
}

export interface InvoiceLayoutVariable {
  key: string
  label: string
  group: 'Company' | 'Invoice' | 'Customer' | 'Order' | 'Other'
  sample: string
}
