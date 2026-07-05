import { ObjectId } from 'mongodb'

import type { AuthUser } from '@shared/types/auth'
import type { LedgerEntry, RecordPaymentInput, SettleCreditInput } from '@shared/types/ledger'
import type { PaymentStatus } from '@shared/types/order'
import { canRecordPayment } from '@shared/types/order'
import { customersRepository } from '../repositories/customers.repository'
import { ledgerRepository } from '../repositories/ledger.repository'
import { ordersRepository } from '../repositories/orders.repository'

export class LedgerService {
  async listByCustomer(customerId: string): Promise<LedgerEntry[]> {
    return ledgerRepository.listByCustomer(customerId)
  }

  async recordOrderPayment(user: AuthUser, input: RecordPaymentInput): Promise<void> {
    const order = await ordersRepository.getById(input.orderId)
    if (!order) {
      throw new Error('Order not found.')
    }

    if (!canRecordPayment(order)) {
      throw new Error('Payment cannot be recorded for this order.')
    }

    const paidAmount = Math.round(input.paidAmount * 100) / 100
    const creditAmount = Math.round(input.creditAmount * 100) / 100
    const totalRecorded = paidAmount + creditAmount

    if (totalRecorded <= 0) {
      throw new Error('Enter a paid or credit amount.')
    }

    if (totalRecorded > order.totals.grandTotal + 0.001) {
      throw new Error('Payment total cannot exceed order grand total.')
    }

    if (creditAmount > 0 && !order.customerId) {
      throw new Error('Select a customer to record credit (udhaar).')
    }

    let paymentStatus: PaymentStatus = 'partial'
    if (Math.abs(totalRecorded - order.totals.grandTotal) < 0.01) {
      paymentStatus = creditAmount > 0 && paidAmount === 0 ? 'credit' : 'paid'
    } else if (creditAmount > 0) {
      paymentStatus = 'partial'
    }

    await ordersRepository.updatePayment(order.id, {
      paidAmount,
      creditAmount,
      paymentStatus,
      paymentMode: input.paymentMode
    })

    if (creditAmount > 0 && order.customerId) {
      await ledgerRepository.createEntry({
        customerId: new ObjectId(order.customerId),
        customerName: order.customerName,
        orderId: new ObjectId(order.id),
        orderNo: order.orderNo,
        type: 'debit',
        amount: creditAmount,
        note: input.note?.trim() || `Credit on order ${order.orderNo}`,
        createdBy: new ObjectId(user.id),
        createdByName: user.displayName
      })
      await customersRepository.updateCreditBalance(order.customerId, creditAmount)
    }
  }

  async settleCredit(user: AuthUser, input: SettleCreditInput): Promise<LedgerEntry> {
    const customer = await customersRepository.getById(input.customerId)
    if (!customer) {
      throw new Error('Customer not found.')
    }

    const amount = Math.round(input.amount * 100) / 100
    if (amount <= 0) {
      throw new Error('Settlement amount must be greater than zero.')
    }

    if (amount > customer.creditBalance + 0.001) {
      throw new Error('Settlement amount exceeds customer credit balance.')
    }

    const entry = await ledgerRepository.createEntry({
      customerId: new ObjectId(customer.id),
      customerName: customer.name,
      orderId: null,
      orderNo: null,
      type: 'credit',
      amount,
      note: input.note?.trim() || 'Credit settlement received',
      createdBy: new ObjectId(user.id),
      createdByName: user.displayName
    })

    await customersRepository.updateCreditBalance(customer.id, -amount)
    return entry
  }

  async getOutstandingCreditTotal(): Promise<number> {
    return ledgerRepository.sumOutstandingCredit()
  }
}

export const ledgerService = new LedgerService()
