import { copyFile } from 'node:fs/promises'
import { basename } from 'node:path'
import { BrowserWindow, dialog, shell } from 'electron'

import type { AuthUser } from '@shared/types/auth'
import type { GenerateBillInput, GenerateBillResult } from '@shared/types/order'
import { canGenerateBillType } from '@shared/types/order'
import { generateBillPdf } from '../billing/pdf-generator'
import { logger } from '../helpers/logger'
import { companyRepository } from '../repositories/company.repository'
import { customersRepository } from '../repositories/customers.repository'
import { ordersRepository } from '../repositories/orders.repository'
import { stockService } from './stock.service'
import { whatsappService } from './whatsapp.service'

export class BillingService {
  async generateBill(user: AuthUser, input: GenerateBillInput): Promise<GenerateBillResult> {
    const order = await ordersRepository.getById(input.orderId)
    if (!order) {
      throw new Error('Order not found.')
    }

    if (!canGenerateBillType(order, input.billType)) {
      if (order.type === 'retail' && order.status !== 'confirmed') {
        throw new Error('This order is not ready for billing yet.')
      }
      if (order.type === 'delivery' && order.status !== 'delivered') {
        throw new Error('This order is not ready for billing yet.')
      }
      throw new Error(
        `A ${input.billType === 'gst' ? 'GST' : 'simple'} invoice already exists for this order.`
      )
    }

    const company = await companyRepository.getProfile()

    if (input.billType === 'gst' && !company.gstin?.trim()) {
      throw new Error('Company GSTIN is required for GST invoices. Update it in Settings.')
    }

    const invoiceNo = await companyRepository.nextInvoiceNumber(input.billType)
    const customer = order.customerId ? await customersRepository.getById(order.customerId) : null

    const filePath = await generateBillPdf({
      order,
      company,
      customer,
      billType: input.billType,
      invoiceNo
    })

    await stockService.maybeDeductOnBill(order)

    const billed = await ordersRepository.addInvoice(
      input.orderId,
      input.billType,
      invoiceNo,
      filePath
    )
    if (!billed) {
      throw new Error('Failed to update order billing status.')
    }

    void whatsappService.notifyInvoiceGenerated(billed, user, input.billType).catch((error) => {
      logger.warn('WhatsApp invoice notification skipped', error)
    })

    return { invoiceNo, filePath, order: billed }
  }

  async openBill(filePath: string): Promise<void> {
    await shell.openPath(filePath)
  }

  async downloadBill(filePath: string, suggestedName?: string): Promise<string | null> {
    const window = BrowserWindow.getFocusedWindow() ?? undefined
    const result = window
      ? await dialog.showSaveDialog(window, {
          defaultPath: suggestedName ?? basename(filePath),
          filters: [{ name: 'PDF invoice', extensions: ['pdf'] }]
        })
      : await dialog.showSaveDialog({
          defaultPath: suggestedName ?? basename(filePath),
          filters: [{ name: 'PDF invoice', extensions: ['pdf'] }]
        })

    if (result.canceled || !result.filePath) {
      return null
    }

    await copyFile(filePath, result.filePath)
    return result.filePath
  }
}

export const billingService = new BillingService()
