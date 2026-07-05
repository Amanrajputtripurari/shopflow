export type BillType = 'simple' | 'gst'

export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'credit'

export type BillingStatus = 'none' | 'billed'

export type PaymentMode = 'cash' | 'upi' | 'bank' | 'mixed'

export type OrderType = 'retail' | 'delivery'

export type OrderStatus =
  | 'draft'
  | 'confirmed'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'

export interface OrderLineExtraCharge {
  name: string
  amount: number
  includedInPrice: boolean
}

export interface OrderLine {
  productId?: string
  nameSnapshot: string
  skuSnapshot: string
  unitSnapshot: string
  hsnSnapshot: string
  qty: number
  rate: number
  discount: number
  taxPercent: number
  extraCharges: OrderLineExtraCharge[]
  lineTotal: number
}

export interface OrderLineInput {
  productId?: string
  nameSnapshot: string
  skuSnapshot?: string
  unitSnapshot: string
  hsnSnapshot?: string
  qty: number
  rate: number
  discount?: number
  taxPercent: number
  extraCharges?: OrderLineExtraCharge[]
}

export interface OrderDelivery {
  address: string
  charge: number
  scheduledAt: string | null
  notes: string
}

export interface OrderTotals {
  subtotal: number
  tax: number
  discount: number
  deliveryCharge: number
  grandTotal: number
}

export interface OrderInvoice {
  billType: BillType
  invoiceNo: string
  billFilePath: string
  billedAt: string
}

export interface OrderInvoiceDocument {
  billType: BillType
  invoiceNo: string
  billFilePath: string
  billedAt: Date
}

export interface Order {
  id: string
  orderNo: string
  type: OrderType
  status: OrderStatus
  billingStatus: BillingStatus
  billType: BillType | null
  invoiceNo: string | null
  invoices: OrderInvoice[]
  paymentStatus: PaymentStatus
  paidAmount: number
  creditAmount: number
  paymentMode: PaymentMode | null
  billedAt: string | null
  billFilePath: string | null
  stockDeducted: boolean
  customerId: string | null
  customerName: string
  customerAddress?: string
  lines: OrderLine[]
  delivery: OrderDelivery | null
  totals: OrderTotals
  notes: string
  createdBy: string
  createdByName: string
  createdAt: string
  updatedAt: string
}

export interface OrderInput {
  type: OrderType
  customerId?: string | null
  customerName: string
  lines: OrderLineInput[]
  delivery?: Partial<OrderDelivery> | null
  notes?: string
}

export interface GenerateBillInput {
  orderId: string
  billType: BillType
}

export interface GenerateBillResult {
  invoiceNo: string
  filePath: string
  order: Order
}

export interface OrderListFilters {
  type?: OrderType | 'all'
  status?: OrderStatus | 'all'
  paymentStatus?: PaymentStatus | 'all'
  search?: string
  limit?: number
  offset?: number
}

export interface OrderListResult {
  items: Order[]
  total: number
  hasMore: boolean
}

export interface OrderListStats {
  all: number
  draft: number
  confirmed: number
  out_for_delivery: number
  delivered: number
  cancelled: number
  retail: number
  delivery: number
}

export interface OrderDocument {
  _id: import('mongodb').ObjectId
  orderNo: string
  type: OrderType
  status: OrderStatus
  billingStatus: BillingStatus
  billType: BillType | null
  invoiceNo: string | null
  paymentStatus: PaymentStatus
  paidAmount: number
  creditAmount: number
  paymentMode: PaymentMode | null
  billedAt: Date | null
  billFilePath: string | null
  stockDeducted: boolean
  customerId: import('mongodb').ObjectId | null
  customerName: string
  lines: OrderLine[]
  delivery: OrderDelivery | null
  totals: OrderTotals
  notes: string
  createdBy: import('mongodb').ObjectId
  createdByName: string
  createdAt: Date
  updatedAt: Date
  invoices?: OrderInvoiceDocument[]
}

export interface DashboardStats {
  todayOrderCount: number
  todayOrderTotal: number
  todayExpenseTotal: number
  todayRoughNet: number
  productCount: number
  customerCount: number
  openOrderCount: number
  outstandingCredit: number
  last7Days: import('@shared/types/report').DailyTrendPoint[]
  orderStatusCounts: { status: OrderStatus; count: number }[]
}

export function nextStatuses(type: OrderType, current: OrderStatus): OrderStatus[] {
  if (current === 'cancelled') return []

  if (type === 'retail') {
    if (current === 'draft') return ['confirmed', 'cancelled']
    if (current === 'confirmed') return ['cancelled']
    return []
  }

  if (current === 'draft') return ['confirmed', 'cancelled']
  if (current === 'confirmed') return ['out_for_delivery', 'cancelled']
  if (current === 'out_for_delivery') return ['delivered', 'cancelled']
  if (current === 'delivered') return []
  return []
}

export function isOrderReadyForBilling(order: Pick<Order, 'type' | 'status'>): boolean {
  if (order.type === 'retail') return order.status === 'confirmed'
  return order.status === 'delivered'
}

export function getOrderInvoices(order: Pick<Order, 'invoices'>): OrderInvoice[] {
  return order.invoices ?? []
}

export function hasBillType(order: Pick<Order, 'invoices'>, billType: BillType): boolean {
  return getOrderInvoices(order).some((invoice) => invoice.billType === billType)
}

export function canGenerateBillType(
  order: Pick<Order, 'type' | 'status' | 'invoices'>,
  billType: BillType
): boolean {
  if (!isOrderReadyForBilling(order)) return false
  return !hasBillType(order, billType)
}

export function canGenerateBill(order: Pick<Order, 'type' | 'status' | 'invoices'>): boolean {
  return canGenerateBillType(order, 'simple') || canGenerateBillType(order, 'gst')
}

export function canRecordPayment(
  order: Pick<Order, 'billingStatus' | 'paymentStatus'>
): boolean {
  return order.billingStatus === 'billed' && order.paymentStatus !== 'paid'
}

export function getOrderExtraCharges(order: Pick<Order, 'totals' | 'delivery'>): number {
  const fromTotals = order.totals.deliveryCharge ?? 0
  const fromDelivery = order.delivery?.charge ?? 0
  return Math.max(fromTotals, fromDelivery)
}

export function getOrderDisplayAddress(
  order: Pick<Order, 'delivery' | 'customerAddress'>
): string {
  const deliveryAddress = order.delivery?.address?.trim()
  if (deliveryAddress) return deliveryAddress
  return order.customerAddress?.trim() ?? ''
}

export function getOrderLineCount(order: Pick<Order, 'lines'>): number {
  return order.lines.length
}

export function getOrderItemQty(order: Pick<Order, 'lines'>): number {
  return order.lines.reduce((sum, line) => sum + line.qty, 0)
}
