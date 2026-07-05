import { ObjectId } from 'mongodb'

import { COLLECTIONS } from '@shared/constants/database'
import { MAX_PRODUCT_EXTRA_CHARGES } from '@shared/constants/product'
import type { Product, ProductDocument, ProductExtraCharge, ProductInput, ProductListFilters } from '@shared/types/product'
import { normalizeExtraCharges } from '@shared/lib/order-line-math'
import type { PaginatedResult } from '@shared/types/pagination'
import { MAX_PAGE_SIZE, normalizePagination, toPaginatedResult } from '@shared/types/pagination'
import type { Filter } from 'mongodb'
import { BaseRepository } from './base.repository'

function normalizeProductExtraCharges(extraCharges?: ProductExtraCharge[]): ProductExtraCharge[] {
  return normalizeExtraCharges(extraCharges).slice(0, MAX_PRODUCT_EXTRA_CHARGES)
}

function toDto(document: ProductDocument): Product {
  return {
    id: document._id.toString(),
    name: document.name,
    sku: document.sku,
    unit: document.unit,
    hsnCode: document.hsnCode ?? '',
    price: document.price,
    taxPercent: document.taxPercent,
    extraCharges: document.extraCharges ?? [],
    currentStock: document.currentStock ?? 0,
    trackStock: document.trackStock ?? false,
    lowStockAlert: document.lowStockAlert ?? 0,
    active: document.active,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString()
  }
}

export class ProductsRepository extends BaseRepository<ProductDocument> {
  constructor() {
    super(COLLECTIONS.PRODUCTS)
  }

  async list(filters: ProductListFilters = {}): Promise<PaginatedResult<Product>> {
    const { limit, offset } = normalizePagination(filters)
    const filter: Filter<ProductDocument> = {}

    const term = filters.search?.trim()
    if (term) {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = { $regex: escaped, $options: 'i' }
      filter.$or = [{ name: regex }, { sku: regex }]
    }

    const { items, total } = await this.findManyPaginated(filter, { name: 1 }, { limit, offset })
    return toPaginatedResult(items.map(toDto), total, offset)
  }

  async listAll(search?: string): Promise<Product[]> {
    const result = await this.list({ search, limit: MAX_PAGE_SIZE, offset: 0 })
    if (result.hasMore) {
      const full = await this.list({ search, limit: 10_000, offset: 0 })
      return full.items
    }
    return result.items
  }

  async getById(id: string): Promise<Product | null> {
    if (!ObjectId.isValid(id)) return null
    const document = await this.findOne({ _id: new ObjectId(id) })
    return document ? toDto(document) : null
  }

  async getDocumentById(id: string): Promise<ProductDocument | null> {
    if (!ObjectId.isValid(id)) return null
    return this.findOne({ _id: new ObjectId(id) })
  }

  async create(input: ProductInput): Promise<Product> {
    const now = new Date()
    const document: ProductDocument = {
      _id: new ObjectId(),
      name: input.name.trim(),
      sku: input.sku.trim().toUpperCase(),
      unit: input.unit.trim(),
      hsnCode: input.hsnCode?.trim() ?? '',
      price: input.price,
      taxPercent: input.taxPercent,
      extraCharges: normalizeProductExtraCharges(input.extraCharges),
      currentStock: input.currentStock ?? 0,
      trackStock: input.trackStock ?? false,
      lowStockAlert: input.lowStockAlert ?? 0,
      active: input.active ?? true,
      createdAt: now,
      updatedAt: now
    }

    const created = await this.insertOneAndReturn(document)
    return toDto(created)
  }

  async update(id: string, input: ProductInput): Promise<Product | null> {
    if (!ObjectId.isValid(id)) return null
    const existing = await this.findOne({ _id: new ObjectId(id) })
    if (!existing) return null

    const updated: ProductDocument = {
      ...existing,
      name: input.name.trim(),
      sku: input.sku.trim().toUpperCase(),
      unit: input.unit.trim(),
      hsnCode: input.hsnCode?.trim() ?? existing.hsnCode ?? '',
      price: input.price,
      taxPercent: input.taxPercent,
      extraCharges: normalizeProductExtraCharges(input.extraCharges ?? existing.extraCharges),
      currentStock: input.currentStock ?? existing.currentStock ?? 0,
      trackStock: input.trackStock ?? existing.trackStock ?? false,
      lowStockAlert: input.lowStockAlert ?? existing.lowStockAlert ?? 0,
      active: input.active ?? existing.active,
      updatedAt: new Date()
    }

    await this.replaceOne({ _id: existing._id }, updated)
    return toDto(updated)
  }

  async adjustStock(productId: string, delta: number): Promise<Product | null> {
    if (!ObjectId.isValid(productId)) return null
    const existing = await this.findOne({ _id: new ObjectId(productId) })
    if (!existing) return null

    const updated: ProductDocument = {
      ...existing,
      currentStock: (existing.currentStock ?? 0) + delta,
      updatedAt: new Date()
    }

    await this.replaceOne({ _id: existing._id }, updated)
    return toDto(updated)
  }

  async delete(id: string): Promise<boolean> {
    if (!ObjectId.isValid(id)) return false
    return this.deleteOne({ _id: new ObjectId(id) })
  }

  async countActive(): Promise<number> {
    return this.count({ active: true })
  }
}

export const productsRepository = new ProductsRepository()
