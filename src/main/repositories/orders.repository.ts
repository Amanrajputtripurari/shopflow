import { ObjectId } from 'mongodb'

import { COLLECTIONS } from '@shared/constants/database'
import type {
  BillType,
  BillingStatus,
  Order,
  OrderDocument,
  OrderInput,
  OrderInvoice,
  OrderInvoiceDocument,
  OrderLine,
  OrderLineInput,
  OrderListFilters,
  OrderListResult,
  OrderListStats,
  OrderStatus,
  OrderTotals,
  PaymentMode,
  PaymentStatus
} from '@shared/types/order'
import { normalizePagination, toPaginatedResult } from '@shared/types/pagination'
import {
  calculateLineTotal as computeLineTotal,
  getLineExtraChargePerUnit,
  normalizeExtraCharges
} from '@shared/lib/order-line-math'
import { BaseRepository } from './base.repository'
import { endOfDay, parseDateKey, startOfDay } from '../helpers/dates'

function resolveInvoices(document: OrderDocument): OrderInvoice[] {
  if (document.invoices?.length) {
    return document.invoices.map((invoice) => ({
      billType: invoice.billType,
      invoiceNo: invoice.invoiceNo,
      billFilePath: invoice.billFilePath,
      billedAt: invoice.billedAt.toISOString()
    }))
  }

  if (document.invoiceNo && document.billFilePath) {
    return [
      {
        billType: document.billType ?? 'simple',
        invoiceNo: document.invoiceNo,
        billFilePath: document.billFilePath,
        billedAt: (document.billedAt ?? document.updatedAt).toISOString()
      }
    ]
  }

  return []
}

function toDto(document: OrderDocument): Order {
  const invoices = resolveInvoices(document)
  const latest = invoices[invoices.length - 1]

  return {
    id: document._id.toString(),
    orderNo: document.orderNo,
    type: document.type,
    status: document.status,
    billingStatus: invoices.length > 0 ? 'billed' : (document.billingStatus ?? 'none'),
    billType: latest?.billType ?? document.billType ?? null,
    invoiceNo: latest?.invoiceNo ?? document.invoiceNo ?? null,
    invoices,
    paymentStatus: document.paymentStatus ?? 'unpaid',
    paidAmount: document.paidAmount ?? 0,
    creditAmount: document.creditAmount ?? 0,
    paymentMode: document.paymentMode ?? null,
    billedAt: latest?.billedAt ?? document.billedAt?.toISOString() ?? null,
    billFilePath: latest?.billFilePath ?? document.billFilePath ?? null,
    stockDeducted: document.stockDeducted ?? false,
    customerId: document.customerId?.toString() ?? null,
    customerName: document.customerName,
    lines: document.lines.map((line) => ({
      ...line,
      extraCharges: line.extraCharges ?? []
    })),
    delivery: document.delivery,
    totals: document.totals,
    notes: document.notes,
    createdBy: document.createdBy.toString(),
    createdByName: document.createdByName,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString()
  }
}

export function calculateLineTotal(line: OrderLineInput): number {
  return computeLineTotal(line)
}

export function buildOrderLines(lines: OrderLineInput[]): OrderLine[] {
  return lines.map((line) => ({
    productId: line.productId,
    nameSnapshot: line.nameSnapshot.trim(),
    skuSnapshot: line.skuSnapshot?.trim().toUpperCase() ?? '',
    unitSnapshot: line.unitSnapshot.trim(),
    hsnSnapshot: line.hsnSnapshot?.trim() ?? '',
    qty: line.qty,
    rate: line.rate,
    discount: line.discount ?? 0,
    taxPercent: line.taxPercent,
    extraCharges: normalizeExtraCharges(line.extraCharges),
    lineTotal: computeLineTotal(line)
  }))
}

export function calculateTotals(lines: OrderLine[], deliveryCharge = 0): OrderTotals {
  const subtotal = lines.reduce((sum, line) => {
    return sum + line.qty * line.rate + line.qty * getLineExtraChargePerUnit(line.extraCharges)
  }, 0)
  const discount = lines.reduce((sum, line) => sum + line.discount, 0)
  const tax = lines.reduce((sum, line) => {
    const base =
      line.qty * line.rate +
      line.qty * getLineExtraChargePerUnit(line.extraCharges) -
      line.discount
    return sum + base * (line.taxPercent / 100)
  }, 0)
  const grandTotal = lines.reduce((sum, line) => sum + line.lineTotal, 0) + deliveryCharge

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    discount: Math.round(discount * 100) / 100,
    deliveryCharge: Math.round(deliveryCharge * 100) / 100,
    grandTotal: Math.round(grandTotal * 100) / 100
  }
}

function defaultOrderFields(now: Date) {
  return {
    billingStatus: 'none' as BillingStatus,
    billType: null,
    invoiceNo: null,
    paymentStatus: 'unpaid' as PaymentStatus,
    paidAmount: 0,
    creditAmount: 0,
    paymentMode: null,
    billedAt: null,
    billFilePath: null,
    invoices: [] as OrderInvoiceDocument[],
    stockDeducted: false,
    updatedAt: now
  }
}

function buildListQuery(
  filters: OrderListFilters = {},
  options: { includeType?: boolean; includeStatus?: boolean } = {}
): Record<string, unknown> {
  const { includeType = true, includeStatus = true } = options
  const query: Record<string, unknown> = {}

  if (includeType && filters.type && filters.type !== 'all') query.type = filters.type
  if (includeStatus && filters.status && filters.status !== 'all') query.status = filters.status
  if (filters.paymentStatus && filters.paymentStatus !== 'all') {
    query.paymentStatus = filters.paymentStatus
  }

  if (filters.search?.trim()) {
    query.$or = [
      { orderNo: { $regex: filters.search.trim(), $options: 'i' } },
      { customerName: { $regex: filters.search.trim(), $options: 'i' } },
      { invoiceNo: { $regex: filters.search.trim(), $options: 'i' } },
      { 'delivery.address': { $regex: filters.search.trim(), $options: 'i' } }
    ]
  }

  return query
}

export class OrdersRepository extends BaseRepository<OrderDocument> {
  constructor() {
    super(COLLECTIONS.ORDERS)
  }

  async generateOrderNo(): Promise<string> {
    const year = new Date().getFullYear()
    const prefix = `ORD-${year}-`
    const count = await this.count({ orderNo: { $regex: `^${prefix}` } })
    return `${prefix}${String(count + 1).padStart(4, '0')}`
  }

  async list(filters: OrderListFilters = {}): Promise<OrderListResult> {
    const { limit, offset } = normalizePagination(filters)
    const query = buildListQuery(filters)
    const { items, total } = await this.findManyPaginated(query, { createdAt: -1 }, { limit, offset })
    return toPaginatedResult(items.map(toDto), total, offset)
  }

  async countListStats(filters: OrderListFilters = {}): Promise<OrderListStats> {
    const baseQuery = buildListQuery(
      { ...filters, status: 'all' },
      { includeStatus: false }
    )
    const statuses = [
      'draft',
      'confirmed',
      'out_for_delivery',
      'delivered',
      'cancelled'
    ] as const

    const [all, draft, confirmed, out_for_delivery, delivered, cancelled, retail, delivery] =
      await Promise.all([
        this.count(baseQuery),
        ...statuses.map((status) => this.count({ ...baseQuery, status })),
        this.count({ ...baseQuery, type: 'retail' }),
        this.count({ ...baseQuery, type: 'delivery' })
      ])

    return { all, draft, confirmed, out_for_delivery, delivered, cancelled, retail, delivery }
  }

  async getById(id: string): Promise<Order | null> {
    if (!ObjectId.isValid(id)) return null
    const document = await this.findOne({ _id: new ObjectId(id) })
    return document ? toDto(document) : null
  }

  async getDocumentById(id: string): Promise<OrderDocument | null> {
    if (!ObjectId.isValid(id)) return null
    return this.findOne({ _id: new ObjectId(id) })
  }

  async create(input: OrderInput, createdBy: string, createdByName: string): Promise<Order> {
    const now = new Date()
    const lines = buildOrderLines(input.lines)
    const deliveryCharge = input.type === 'delivery' ? (input.delivery?.charge ?? 0) : 0
    const totals = calculateTotals(lines, deliveryCharge)

    const document: OrderDocument = {
      _id: new ObjectId(),
      orderNo: await this.generateOrderNo(),
      type: input.type,
      status: 'draft',
      ...defaultOrderFields(now),
      customerId:
        input.customerId && ObjectId.isValid(input.customerId)
          ? new ObjectId(input.customerId)
          : null,
      customerName: input.customerName.trim() || 'Walk-in Customer',
      lines,
      delivery:
        input.type === 'delivery'
          ? {
              address: input.delivery?.address?.trim() ?? '',
              charge: deliveryCharge,
              scheduledAt: input.delivery?.scheduledAt ?? null,
              notes: input.delivery?.notes?.trim() ?? ''
            }
          : null,
      totals,
      notes: input.notes?.trim() ?? '',
      createdBy: new ObjectId(createdBy),
      createdByName,
      createdAt: now,
      updatedAt: now
    }

    const created = await this.insertOneAndReturn(document)
    return toDto(created)
  }

  async update(id: string, input: OrderInput): Promise<Order | null> {
    if (!ObjectId.isValid(id)) return null
    const existing = await this.findOne({ _id: new ObjectId(id) })
    if (!existing || existing.status === 'cancelled' || existing.billingStatus === 'billed') {
      return null
    }

    const lines = buildOrderLines(input.lines)
    const deliveryCharge = input.type === 'delivery' ? (input.delivery?.charge ?? 0) : 0
    const totals = calculateTotals(lines, deliveryCharge)

    const updated: OrderDocument = {
      ...existing,
      type: input.type,
      customerId:
        input.customerId && ObjectId.isValid(input.customerId)
          ? new ObjectId(input.customerId)
          : null,
      customerName: input.customerName.trim() || 'Walk-in Customer',
      lines,
      delivery:
        input.type === 'delivery'
          ? {
              address: input.delivery?.address?.trim() ?? '',
              charge: deliveryCharge,
              scheduledAt: input.delivery?.scheduledAt ?? null,
              notes: input.delivery?.notes?.trim() ?? ''
            }
          : null,
      totals,
      notes: input.notes?.trim() ?? '',
      updatedAt: new Date()
    }

    await this.replaceOne({ _id: existing._id }, updated)
    return toDto(updated)
  }

  async updateStatus(id: string, status: OrderStatus): Promise<Order | null> {
    if (!ObjectId.isValid(id)) return null
    const existing = await this.findOne({ _id: new ObjectId(id) })
    if (!existing) return null

    const updated: OrderDocument = {
      ...existing,
      status,
      updatedAt: new Date()
    }

    await this.replaceOne({ _id: existing._id }, updated)
    return toDto(updated)
  }

  async addInvoice(
    id: string,
    billType: BillType,
    invoiceNo: string,
    billFilePath: string
  ): Promise<Order | null> {
    if (!ObjectId.isValid(id)) return null
    const existing = await this.findOne({ _id: new ObjectId(id) })
    if (!existing) return null

    const currentInvoices = resolveInvoices(existing).map((invoice) => ({
      billType: invoice.billType,
      invoiceNo: invoice.invoiceNo,
      billFilePath: invoice.billFilePath,
      billedAt: new Date(invoice.billedAt)
    }))

    if (currentInvoices.some((invoice) => invoice.billType === billType)) {
      throw new Error(`A ${billType} invoice already exists for this order.`)
    }

    const billedAt = new Date()
    const nextInvoice: OrderInvoiceDocument = {
      billType,
      invoiceNo,
      billFilePath,
      billedAt
    }
    const invoices = [...currentInvoices, nextInvoice]

    const updated: OrderDocument = {
      ...existing,
      invoices,
      billingStatus: 'billed',
      billType,
      invoiceNo,
      billFilePath,
      billedAt,
      updatedAt: new Date()
    }

    await this.replaceOne({ _id: existing._id }, updated)
    return toDto(updated)
  }

  /** @deprecated Use addInvoice */
  async markBilled(
    id: string,
    billType: BillType,
    invoiceNo: string,
    billFilePath: string
  ): Promise<Order | null> {
    return this.addInvoice(id, billType, invoiceNo, billFilePath)
  }

  async updatePayment(
    id: string,
    payment: {
      paidAmount: number
      creditAmount: number
      paymentStatus: PaymentStatus
      paymentMode: PaymentMode
    }
  ): Promise<Order | null> {
    if (!ObjectId.isValid(id)) return null
    const existing = await this.findOne({ _id: new ObjectId(id) })
    if (!existing) return null

    const updated: OrderDocument = {
      ...existing,
      paidAmount: payment.paidAmount,
      creditAmount: payment.creditAmount,
      paymentStatus: payment.paymentStatus,
      paymentMode: payment.paymentMode,
      updatedAt: new Date()
    }

    await this.replaceOne({ _id: existing._id }, updated)
    return toDto(updated)
  }

  async markStockDeducted(id: string): Promise<void> {
    if (!ObjectId.isValid(id)) return
    await this.updateOne(
      { _id: new ObjectId(id) },
      { $set: { stockDeducted: true, updatedAt: new Date() } }
    )
  }

  async getTodayStats(): Promise<{ count: number; total: number }> {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const documents = await this.findMany({ createdAt: { $gte: start } }, { createdAt: -1 }, 500)
    return {
      count: documents.length,
      total: documents.reduce((sum, order) => sum + order.totals.grandTotal, 0)
    }
  }

  async getDailySalesTotals(from: string, to: string): Promise<Map<string, number>> {
    const start = startOfDay(parseDateKey(from))
    const end = endOfDay(parseDateKey(to))

    const rows = await this.collection
      .aggregate<{ _id: string; total: number }>([
        {
          $match: {
            createdAt: { $gte: start, $lte: end },
            status: { $ne: 'cancelled' }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            total: { $sum: '$totals.grandTotal' }
          }
        }
      ])
      .toArray()

    return new Map(rows.map((row) => [row._id, row.total]))
  }

  async getOrderStatusCounts(): Promise<{ status: OrderStatus; count: number }[]> {
    const statuses: OrderStatus[] = [
      'draft',
      'confirmed',
      'out_for_delivery',
      'delivered',
      'cancelled'
    ]

    const counts = await Promise.all(
      statuses.map(async (status) => ({
        status,
        count: await this.count({ status })
      }))
    )

    return counts
  }

  async countOpen(): Promise<number> {
    return this.count({
      status: { $nin: ['delivered', 'cancelled'] },
      paymentStatus: { $ne: 'paid' }
    })
  }

  async getSalesSummary(from: string, to: string): Promise<{
    orderCount: number
    totalSales: number
    paidAmount: number
    creditAmount: number
  }> {
    const start = startOfDay(parseDateKey(from))
    const end = endOfDay(parseDateKey(to))

    const documents = await this.findMany(
      {
        createdAt: { $gte: start, $lte: end },
        status: { $ne: 'cancelled' }
      },
      { createdAt: -1 },
      5000
    )

    return {
      orderCount: documents.length,
      totalSales: documents.reduce((sum, order) => sum + order.totals.grandTotal, 0),
      paidAmount: documents.reduce((sum, order) => sum + (order.paidAmount ?? 0), 0),
      creditAmount: documents.reduce((sum, order) => sum + (order.creditAmount ?? 0), 0)
    }
  }
}

export const ordersRepository = new OrdersRepository()
