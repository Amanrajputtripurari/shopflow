import { ObjectId } from 'mongodb'

import { COLLECTIONS } from '@shared/constants/database'
import type { Customer, CustomerDocument, CustomerInput, CustomerListFilters, CustomerSearchQuery, CustomerSearchResult } from '@shared/types/customer'
import type { PaginatedResult } from '@shared/types/pagination'
import { MAX_PAGE_SIZE, normalizePagination, toPaginatedResult } from '@shared/types/pagination'
import type { Filter } from 'mongodb'
import { BaseRepository } from './base.repository'

function toDto(document: CustomerDocument): Customer {
  return {
    id: document._id.toString(),
    name: document.name,
    phone: document.phone,
    address: document.address,
    gstin: document.gstin,
    tags: document.tags,
    creditBalance: document.creditBalance ?? 0,
    active: document.active,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString()
  }
}

export class CustomersRepository extends BaseRepository<CustomerDocument> {
  constructor() {
    super(COLLECTIONS.CUSTOMERS)
  }

  async list(filters: CustomerListFilters = {}): Promise<PaginatedResult<Customer>> {
    const { limit, offset } = normalizePagination(filters)
    const filter: Filter<CustomerDocument> = {}

    const term = filters.search?.trim()
    if (term) {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = { $regex: escaped, $options: 'i' }
      filter.$or = [{ name: regex }, { phone: regex }]
    }

    const { items, total } = await this.findManyPaginated(filter, { name: 1 }, { limit, offset })
    return toPaginatedResult(items.map(toDto), total, offset)
  }

  /** Unpaginated list for seeds and internal tooling. */
  async listAll(search?: string): Promise<Customer[]> {
    const result = await this.list({ search, limit: MAX_PAGE_SIZE, offset: 0 })
    if (result.hasMore) {
      const full = await this.list({ search, limit: 10_000, offset: 0 })
      return full.items
    }
    return result.items
  }

  async searchPaginated(query: CustomerSearchQuery = {}): Promise<CustomerSearchResult> {
    const limit = Math.min(Math.max(query.limit ?? 10, 1), 50)
    const offset = Math.max(query.offset ?? 0, 0)
    const filter: Filter<CustomerDocument> = {}

    if (query.activeOnly !== false) {
      filter.active = true
    }

    const term = query.search?.trim()
    if (term) {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = { $regex: escaped, $options: 'i' }
      filter.$or = [{ name: regex }, { phone: regex }]
    }

    const [documents, total] = await Promise.all([
      this.collection.find(filter).sort({ name: 1 }).skip(offset).limit(limit).toArray(),
      this.collection.countDocuments(filter)
    ])

    const items = (documents as CustomerDocument[]).map(toDto)
    return {
      items,
      total,
      hasMore: offset + items.length < total
    }
  }

  async getById(id: string): Promise<Customer | null> {
    if (!ObjectId.isValid(id)) return null
    const document = await this.findOne({ _id: new ObjectId(id) })
    return document ? toDto(document) : null
  }

  async create(input: CustomerInput): Promise<Customer> {
    const now = new Date()
    const document: CustomerDocument = {
      _id: new ObjectId(),
      name: input.name.trim(),
      phone: input.phone?.trim() ?? '',
      address: input.address?.trim() ?? '',
      gstin: input.gstin?.trim().toUpperCase() ?? '',
      tags: input.tags ?? [],
      creditBalance: 0,
      active: input.active ?? true,
      createdAt: now,
      updatedAt: now
    }

    const created = await this.insertOneAndReturn(document)
    return toDto(created)
  }

  async update(id: string, input: CustomerInput): Promise<Customer | null> {
    if (!ObjectId.isValid(id)) return null
    const existing = await this.findOne({ _id: new ObjectId(id) })
    if (!existing) return null

    const updated: CustomerDocument = {
      ...existing,
      name: input.name.trim(),
      phone: input.phone?.trim() ?? '',
      address: input.address?.trim() ?? '',
      gstin: input.gstin?.trim().toUpperCase() ?? '',
      tags: input.tags ?? existing.tags,
      active: input.active ?? existing.active,
      updatedAt: new Date()
    }

    await this.replaceOne({ _id: existing._id }, updated)
    return toDto(updated)
  }

  async updateCreditBalance(customerId: string, delta: number): Promise<void> {
    if (!ObjectId.isValid(customerId)) return
    await this.updateOne(
      { _id: new ObjectId(customerId) },
      {
        $inc: { creditBalance: delta },
        $set: { updatedAt: new Date() }
      }
    )
  }

  async delete(id: string): Promise<boolean> {
    if (!ObjectId.isValid(id)) return false
    return this.deleteOne({ _id: new ObjectId(id) })
  }

  async countActive(): Promise<number> {
    return this.count({ active: true })
  }

  async findByPhone(phone: string): Promise<Customer | null> {
    const digits = phone.replace(/\D/g, '')
    if (!digits) return null
    const last10 = digits.slice(-10)
    const document = await this.collection.findOne({
      $or: [{ phone: digits }, { phone: last10 }, { phone: { $regex: `${last10}$` } }]
    })
    return document ? toDto(document as CustomerDocument) : null
  }
}

export const customersRepository = new CustomersRepository()
