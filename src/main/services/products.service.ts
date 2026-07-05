import type { AuthUser } from '@shared/types/auth'
import type { Product, ProductInput, ProductListFilters } from '@shared/types/product'
import { MAX_PRODUCT_EXTRA_CHARGES } from '@shared/constants/product'
import type { PaginatedResult } from '@shared/types/pagination'
import { productsRepository } from '../repositories/products.repository'

export class ProductsService {
  async list(filters: ProductListFilters = {}): Promise<PaginatedResult<Product>> {
    return productsRepository.list(filters)
  }

  async get(id: string): Promise<Product> {
    const product = await productsRepository.getById(id)
    if (!product) {
      throw new Error('Product not found.')
    }
    return product
  }

  async create(user: AuthUser, input: ProductInput): Promise<Product> {
    this.validateInput(input)
    return productsRepository.create(input)
  }

  async update(user: AuthUser, id: string, input: ProductInput): Promise<Product> {
    this.validateInput(input)
    const product = await productsRepository.update(id, input)
    if (!product) {
      throw new Error('Product not found.')
    }
    return product
  }

  async delete(user: AuthUser, id: string): Promise<void> {
    if (user.role !== 'admin') {
      throw new Error('Only administrators can delete products.')
    }

    const deleted = await productsRepository.delete(id)
    if (!deleted) {
      throw new Error('Product not found.')
    }
  }

  private validateInput(input: ProductInput): void {
    if (!input.name.trim()) throw new Error('Product name is required.')
    if (!input.sku.trim()) throw new Error('SKU is required.')
    if (!input.unit.trim()) throw new Error('Unit is required.')
    if (input.price < 0) throw new Error('Price cannot be negative.')
    if (input.taxPercent < 0) throw new Error('Tax cannot be negative.')

    for (const charge of input.extraCharges ?? []) {
      if (!charge.name.trim()) throw new Error('Extra charge name is required.')
      if (charge.amount < 0) throw new Error('Extra charge amount cannot be negative.')
    }

    const chargeCount = (input.extraCharges ?? []).filter((charge) => charge.name.trim()).length
    if (chargeCount > MAX_PRODUCT_EXTRA_CHARGES) {
      throw new Error(`A product can have at most ${MAX_PRODUCT_EXTRA_CHARGES} extra charges.`)
    }
  }
}

export const productsService = new ProductsService()
