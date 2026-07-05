import type { AuthUser } from '@shared/types/auth'
import type {
  DashboardStats,
  Order,
  OrderInput,
  OrderListFilters,
  OrderListResult,
  OrderListStats,
  OrderStatus
} from '@shared/types/order'
import { nextStatuses } from '@shared/types/order'
import { lastNDaysRange, mergeDailyTrend } from '../helpers/analytics'
import { customersRepository } from '../repositories/customers.repository'
import { expensesRepository } from '../repositories/expenses.repository'
import { ordersRepository } from '../repositories/orders.repository'
import { productsRepository } from '../repositories/products.repository'
import { ledgerService } from './ledger.service'
import { stockService } from './stock.service'
import { whatsappService } from './whatsapp.service'
import { logger } from '../helpers/logger'

export class OrdersService {
  async list(filters: OrderListFilters): Promise<OrderListResult> {
    const result = await ordersRepository.list(filters)
    return {
      ...result,
      items: await this.enrichOrders(result.items)
    }
  }

  async listStats(filters: OrderListFilters): Promise<OrderListStats> {
    return ordersRepository.countListStats(filters)
  }

  private async enrichOrders(orders: Order[]): Promise<Order[]> {
    const customerIds = [
      ...new Set(orders.map((order) => order.customerId).filter((id): id is string => Boolean(id)))
    ]

    const addressByCustomerId = new Map<string, string>()
    await Promise.all(
      customerIds.map(async (customerId) => {
        const customer = await customersRepository.getById(customerId)
        if (customer?.address?.trim()) {
          addressByCustomerId.set(customerId, customer.address.trim())
        }
      })
    )

    return orders.map((order) => ({
      ...order,
      customerAddress: order.customerId ? addressByCustomerId.get(order.customerId) : undefined
    }))
  }

  async get(id: string): Promise<Order> {
    const order = await ordersRepository.getById(id)
    if (!order) {
      throw new Error('Order not found.')
    }
    return (await this.enrichOrders([order]))[0]
  }

  async create(user: AuthUser, input: OrderInput): Promise<Order> {
    this.validateInput(input)
    const order = await ordersRepository.create(input, user.id, user.displayName)
    void whatsappService.handleOrderCreateAutomation(user, order).catch((error) => {
      logger.warn('WhatsApp order create automation skipped', error)
    })
    return order
  }

  async update(user: AuthUser, id: string, input: OrderInput): Promise<Order> {
    const existing = await this.get(id)

    if (existing.status === 'cancelled') {
      throw new Error('Cancelled orders cannot be edited.')
    }

    if (existing.billingStatus === 'billed') {
      throw new Error('Billed orders cannot be edited.')
    }

    if (user.role === 'staff' && !['draft', 'confirmed'].includes(existing.status)) {
      throw new Error('Staff can only edit draft or confirmed orders.')
    }

    this.validateInput(input)
    const order = await ordersRepository.update(id, input)
    if (!order) {
      throw new Error('Order not found.')
    }
    return order
  }

  async updateStatus(user: AuthUser, id: string, status: OrderStatus): Promise<Order> {
    const existing = await this.get(id)

    if (status === 'cancelled' && user.role !== 'admin') {
      throw new Error('Only administrators can cancel orders.')
    }

    const allowed = nextStatuses(existing.type, existing.status)
    if (!allowed.includes(status)) {
      throw new Error(`Cannot change status from ${existing.status} to ${status}.`)
    }

    const order = await ordersRepository.updateStatus(id, status)
    if (!order) {
      throw new Error('Order not found.')
    }

    await stockService.maybeDeductOnStatus(order, status)
    void whatsappService.notifyOrderStatus(order, status).catch((error) => {
      logger.warn('WhatsApp order notification skipped', error)
    })
    return order
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const range = lastNDaysRange(7)

    const [
      today,
      productCount,
      customerCount,
      openOrderCount,
      outstandingCredit,
      todayExpenseTotal,
      salesByDay,
      expensesByDay,
      orderStatusCounts
    ] = await Promise.all([
      ordersRepository.getTodayStats(),
      productsRepository.countActive(),
      customersRepository.countActive(),
      ordersRepository.countOpen(),
      ledgerService.getOutstandingCreditTotal(),
      expensesRepository.getTodayTotal(),
      ordersRepository.getDailySalesTotals(range.from, range.to),
      expensesRepository.getDailyExpenseTotals(range.from, range.to),
      ordersRepository.getOrderStatusCounts()
    ])

    const todayOrderTotal = Math.round(today.total * 100) / 100
    const expenseTotal = Math.round(todayExpenseTotal * 100) / 100

    return {
      todayOrderCount: today.count,
      todayOrderTotal,
      todayExpenseTotal: expenseTotal,
      todayRoughNet: Math.round((todayOrderTotal - expenseTotal) * 100) / 100,
      productCount,
      customerCount,
      openOrderCount,
      outstandingCredit: Math.round(outstandingCredit * 100) / 100,
      last7Days: mergeDailyTrend(range.from, range.to, salesByDay, expensesByDay),
      orderStatusCounts
    }
  }

  private validateInput(input: OrderInput): void {
    if (!input.lines.length) {
      throw new Error('Add at least one line item.')
    }

    for (const line of input.lines) {
      if (!line.nameSnapshot.trim()) {
        throw new Error('Each line item needs a product name.')
      }
      if (line.qty <= 0) {
        throw new Error('Quantity must be greater than zero.')
      }
      if (line.rate < 0) {
        throw new Error('Rate cannot be negative.')
      }
    }

    if (input.type === 'delivery' && !input.delivery?.address?.trim()) {
      throw new Error('Delivery address is required for delivery orders.')
    }
  }
}

export const ordersService = new OrdersService()
