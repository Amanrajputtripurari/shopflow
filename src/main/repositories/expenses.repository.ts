import { ObjectId } from 'mongodb'

import { COLLECTIONS } from '@shared/constants/database'
import type {
  Expense,
  ExpenseDocument,
  ExpenseInput,
  ExpenseListFilters,
  ExpenseListResult
} from '@shared/types/expense'
import { normalizePagination, toPaginatedResult } from '@shared/types/pagination'
import { BaseRepository } from './base.repository'
import { endOfDay, parseDateKey, startOfDay, toDateKey } from '../helpers/dates'

function toDto(document: ExpenseDocument): Expense {
  return {
    id: document._id.toString(),
    date: toDateKey(document.date),
    amount: document.amount,
    categoryId: document.categoryId?.toString() ?? null,
    categoryName: document.categoryName,
    customCategory: document.customCategory,
    paymentMode: document.paymentMode,
    note: document.note,
    receiptRef: document.receiptRef,
    createdBy: document.createdBy.toString(),
    createdByName: document.createdByName,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString()
  }
}

export function parseExpenseDate(value: string): Date {
  return parseDateKey(value)
}

export class ExpensesRepository extends BaseRepository<ExpenseDocument> {
  constructor() {
    super(COLLECTIONS.EXPENSES)
  }

  private buildListFilter(filters: ExpenseListFilters = {}): Record<string, unknown> {
    const query: Record<string, unknown> = {}

    if (filters.from || filters.to) {
      const range: Record<string, Date> = {}
      if (filters.from) {
        range.$gte = startOfDay(parseExpenseDate(filters.from))
      }
      if (filters.to) {
        range.$lte = endOfDay(parseExpenseDate(filters.to))
      }
      query.date = range
    }

    if (filters.categoryId && ObjectId.isValid(filters.categoryId)) {
      query.categoryId = new ObjectId(filters.categoryId)
    }

    if (filters.search?.trim()) {
      query.$or = [
        { categoryName: { $regex: filters.search.trim(), $options: 'i' } },
        { note: { $regex: filters.search.trim(), $options: 'i' } }
      ]
    }

    return query
  }

  async list(filters: ExpenseListFilters = {}): Promise<ExpenseListResult> {
    const { limit, offset } = normalizePagination(filters)
    const query = this.buildListFilter(filters)

    const [{ items, total }, totalAmount] = await Promise.all([
      this.findManyPaginated(query, { date: -1, createdAt: -1 }, { limit, offset }),
      this.sumAmount(query)
    ])

    return {
      ...toPaginatedResult(items.map(toDto), total, offset),
      totalAmount
    }
  }

  private async sumAmount(filter: Record<string, unknown>): Promise<number> {
    const result = await this.collection
      .aggregate<{ total: number }>([
        { $match: filter },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
      .toArray()

    return Math.round((result[0]?.total ?? 0) * 100) / 100
  }

  async getDailyExpenseTotals(from: string, to: string): Promise<Map<string, number>> {
    const query = this.buildListFilter({ from, to })

    const rows = await this.collection
      .aggregate<{ _id: string; total: number }>([
        { $match: query },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            total: { $sum: '$amount' }
          }
        }
      ])
      .toArray()

    return new Map(rows.map((row) => [row._id, row.total]))
  }

  async getById(id: string): Promise<Expense | null> {
    if (!ObjectId.isValid(id)) return null
    const document = await this.findOne({ _id: new ObjectId(id) })
    return document ? toDto(document) : null
  }

  async create(
    input: ExpenseInput,
    meta: {
      categoryId: ObjectId | null
      categoryName: string
      customCategory: boolean
      createdBy: ObjectId
      createdByName: string
    }
  ): Promise<Expense> {
    const now = new Date()
    const document: ExpenseDocument = {
      _id: new ObjectId(),
      date: parseExpenseDate(input.date),
      amount: input.amount,
      categoryId: meta.categoryId,
      categoryName: meta.categoryName,
      customCategory: meta.customCategory,
      paymentMode: input.paymentMode,
      note: input.note?.trim() ?? '',
      receiptRef: input.receiptRef?.trim() ?? '',
      createdBy: meta.createdBy,
      createdByName: meta.createdByName,
      createdAt: now,
      updatedAt: now
    }

    const created = await this.insertOneAndReturn(document)
    return toDto(created)
  }

  async update(
    id: string,
    input: ExpenseInput,
    meta: {
      categoryId: ObjectId | null
      categoryName: string
      customCategory: boolean
    }
  ): Promise<Expense | null> {
    if (!ObjectId.isValid(id)) return null
    const existing = await this.findOne({ _id: new ObjectId(id) })
    if (!existing) return null

    const updated: ExpenseDocument = {
      ...existing,
      date: parseExpenseDate(input.date),
      amount: input.amount,
      categoryId: meta.categoryId,
      categoryName: meta.categoryName,
      customCategory: meta.customCategory,
      paymentMode: input.paymentMode,
      note: input.note?.trim() ?? '',
      receiptRef: input.receiptRef?.trim() ?? existing.receiptRef,
      updatedAt: new Date()
    }

    await this.replaceOne({ _id: existing._id }, updated)
    return toDto(updated)
  }

  async delete(id: string): Promise<boolean> {
    if (!ObjectId.isValid(id)) return false
    return this.deleteOne({ _id: new ObjectId(id) })
  }

  async getTodayTotal(): Promise<number> {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = new Date()
    end.setHours(23, 59, 59, 999)

    const documents = await this.findMany({ date: { $gte: start, $lte: end } }, { date: -1 }, 1000)
    return documents.reduce((sum, expense) => sum + expense.amount, 0)
  }

  async getSummary(from: string, to: string): Promise<{
    entryCount: number
    totalExpenses: number
    byCategory: { categoryName: string; total: number; count: number }[]
  }> {
    const documents = await this.findMany(
      {
        date: {
          $gte: startOfDay(parseExpenseDate(from)),
          $lte: endOfDay(parseExpenseDate(to))
        }
      },
      { date: -1 },
      5000
    )

    const byCategory = new Map<string, { total: number; count: number }>()
    let totalExpenses = 0

    for (const expense of documents) {
      totalExpenses += expense.amount
      const key = expense.categoryName || 'Uncategorized'
      const current = byCategory.get(key) ?? { total: 0, count: 0 }
      current.total += expense.amount
      current.count += 1
      byCategory.set(key, current)
    }

    return {
      entryCount: documents.length,
      totalExpenses,
      byCategory: [...byCategory.entries()]
        .map(([categoryName, stats]) => ({
          categoryName,
          total: Math.round(stats.total * 100) / 100,
          count: stats.count
        }))
        .sort((a, b) => b.total - a.total)
    }
  }
}

export const expensesRepository = new ExpensesRepository()
