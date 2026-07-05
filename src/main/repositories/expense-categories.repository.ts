import { ObjectId } from 'mongodb'

import { COLLECTIONS } from '@shared/constants/database'
import type { ExpenseCategory, ExpenseCategoryDocument, ExpenseCategoryInput } from '@shared/types/expense'
import { BaseRepository } from './base.repository'

function toDto(document: ExpenseCategoryDocument): ExpenseCategory {
  return {
    id: document._id.toString(),
    name: document.name,
    active: document.active,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString()
  }
}

export class ExpenseCategoriesRepository extends BaseRepository<ExpenseCategoryDocument> {
  constructor() {
    super(COLLECTIONS.EXPENSE_CATEGORIES)
  }

  async list(includeInactive = false): Promise<ExpenseCategory[]> {
    const filter = includeInactive ? {} : { active: true }
    const documents = await this.findMany(filter, { name: 1 })
    return documents.map(toDto)
  }

  async getById(id: string): Promise<ExpenseCategory | null> {
    if (!ObjectId.isValid(id)) return null
    const document = await this.findOne({ _id: new ObjectId(id) })
    return document ? toDto(document) : null
  }

  async findByName(name: string): Promise<ExpenseCategoryDocument | null> {
    const trimmed = name.trim()
    if (!trimmed) return null
    return this.findOne({
      name: { $regex: new RegExp(`^${escapeRegex(trimmed)}$`, 'i') }
    })
  }

  async create(input: ExpenseCategoryInput): Promise<ExpenseCategory> {
    const now = new Date()
    const document: ExpenseCategoryDocument = {
      _id: new ObjectId(),
      name: input.name.trim(),
      active: input.active ?? true,
      createdAt: now,
      updatedAt: now
    }

    const created = await this.insertOneAndReturn(document)
    return toDto(created)
  }

  async update(id: string, input: ExpenseCategoryInput): Promise<ExpenseCategory | null> {
    if (!ObjectId.isValid(id)) return null
    const existing = await this.findOne({ _id: new ObjectId(id) })
    if (!existing) return null

    const updated: ExpenseCategoryDocument = {
      ...existing,
      name: input.name.trim(),
      active: input.active ?? existing.active,
      updatedAt: new Date()
    }

    await this.replaceOne({ _id: existing._id }, updated)
    return toDto(updated)
  }

  async delete(id: string): Promise<boolean> {
    if (!ObjectId.isValid(id)) return false
    return this.deleteOne({ _id: new ObjectId(id) })
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export const expenseCategoriesRepository = new ExpenseCategoriesRepository()
