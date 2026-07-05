import type { Order, OrderLine } from '@shared/types/order'
import type { CompanyProfile } from '@shared/types/company'
import { companyRepository } from '../repositories/company.repository'
import { ordersRepository } from '../repositories/orders.repository'
import { productsRepository } from '../repositories/products.repository'

export class StockService {
  async deductForOrder(order: Order, company: CompanyProfile): Promise<void> {
    if (!company.stockSettings.stockTrackingEnabled || order.stockDeducted) {
      return
    }

    for (const line of order.lines) {
      if (!line.productId) continue

      const product = await productsRepository.getDocumentById(line.productId)
      if (!product || !product.trackStock) continue

      const nextStock = (product.currentStock ?? 0) - line.qty
      if (nextStock < 0 && !company.stockSettings.allowNegativeStock) {
        throw new Error(`Insufficient stock for ${line.nameSnapshot}.`)
      }

      await productsRepository.adjustStock(line.productId, -line.qty)
    }

    await ordersRepository.markStockDeducted(order.id)
  }

  async maybeDeductOnStatus(order: Order, newStatus: Order['status']): Promise<void> {
    const company = await companyRepository.getProfile()
    if (!company.stockSettings.stockTrackingEnabled) return
    if (company.stockSettings.stockDeductOn !== 'confirm') return
    if (newStatus !== 'confirmed') return

    await this.deductForOrder(order, company)
  }

  async maybeDeductOnBill(order: Order): Promise<void> {
    const company = await companyRepository.getProfile()
    if (!company.stockSettings.stockTrackingEnabled) return
    if (company.stockSettings.stockDeductOn !== 'bill') return

    await this.deductForOrder(order, company)
  }

  async adjustStock(productId: string, quantity: number): Promise<void> {
    const product = await productsRepository.adjustStock(productId, quantity)
    if (!product) {
      throw new Error('Product not found.')
    }
  }
}

export const stockService = new StockService()
