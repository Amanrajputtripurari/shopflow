import { ObjectId } from 'mongodb'

import type { AuthUser } from '@shared/types/auth'
import type {
  Expense,
  ExpenseCategory,
  ExpenseCategoryInput,
  ExpenseInput,
  ExpenseListFilters,
  ExpenseListResult
} from '@shared/types/expense'
import { expenseCategoriesRepository } from '../repositories/expense-categories.repository'
import { expensesRepository } from '../repositories/expenses.repository'

export class ExpenseCategoriesService {
  async list(): Promise<ExpenseCategory[]> {
    return expenseCategoriesRepository.list(true)
  }

  async create(user: AuthUser, input: ExpenseCategoryInput): Promise<ExpenseCategory> {
    if (user.role !== 'admin') {
      throw new Error('Only administrators can manage expense categories.')
    }

    if (!input.name.trim()) {
      throw new Error('Category name is required.')
    }

    const existing = await expenseCategoriesRepository.findByName(input.name)
    if (existing) {
      throw new Error('A category with this name already exists.')
    }

    return expenseCategoriesRepository.create(input)
  }

  async update(user: AuthUser, id: string, input: ExpenseCategoryInput): Promise<ExpenseCategory> {
    if (user.role !== 'admin') {
      throw new Error('Only administrators can manage expense categories.')
    }

    if (!input.name.trim()) {
      throw new Error('Category name is required.')
    }

    const category = await expenseCategoriesRepository.update(id, input)
    if (!category) {
      throw new Error('Category not found.')
    }
    return category
  }

  async delete(user: AuthUser, id: string): Promise<void> {
    if (user.role !== 'admin') {
      throw new Error('Only administrators can manage expense categories.')
    }

    const deleted = await expenseCategoriesRepository.delete(id)
    if (!deleted) {
      throw new Error('Category not found.')
    }
  }
}

export class ExpensesService {
  async list(filters: ExpenseListFilters = {}): Promise<ExpenseListResult> {
    return expensesRepository.list(filters)
  }

  async create(user: AuthUser, input: ExpenseInput): Promise<Expense> {
    this.validateInput(input)
    const meta = await this.resolveCategory(input)

    if (input.saveCustomAsPreset && meta.customCategory && user.role === 'admin') {
      const existing = await expenseCategoriesRepository.findByName(meta.categoryName)
      if (!existing) {
        const created = await expenseCategoriesRepository.create({ name: meta.categoryName })
        meta.categoryId = new ObjectId(created.id)
        meta.customCategory = false
      } else {
        meta.categoryId = existing._id
        meta.customCategory = false
      }
    }

    return expensesRepository.create(input, {
      ...meta,
      createdBy: new ObjectId(user.id),
      createdByName: user.displayName
    })
  }

  async update(user: AuthUser, id: string, input: ExpenseInput): Promise<Expense> {
    if (user.role !== 'admin') {
      throw new Error('Only administrators can edit expenses.')
    }

    this.validateInput(input)
    const meta = await this.resolveCategory(input)

    const expense = await expensesRepository.update(id, input, meta)
    if (!expense) {
      throw new Error('Expense not found.')
    }
    return expense
  }

  async delete(user: AuthUser, id: string): Promise<void> {
    if (user.role !== 'admin') {
      throw new Error('Only administrators can delete expenses.')
    }

    const deleted = await expensesRepository.delete(id)
    if (!deleted) {
      throw new Error('Expense not found.')
    }
  }

  private validateInput(input: ExpenseInput): void {
    if (!input.date?.trim()) {
      throw new Error('Expense date is required.')
    }

    if (input.amount <= 0) {
      throw new Error('Amount must be greater than zero.')
    }

    if (!input.categoryId && !input.customCategoryName?.trim()) {
      throw new Error('Select a category or enter a custom category name.')
    }
  }

  private async resolveCategory(input: ExpenseInput): Promise<{
    categoryId: ObjectId | null
    categoryName: string
    customCategory: boolean
  }> {
    if (input.categoryId) {
      const category = await expenseCategoriesRepository.getById(input.categoryId)
      if (!category) {
        throw new Error('Selected category not found.')
      }
      if (!category.active) {
        throw new Error('Selected category is inactive.')
      }
      return {
        categoryId: new ObjectId(category.id),
        categoryName: category.name,
        customCategory: false
      }
    }

    const name = input.customCategoryName!.trim()
    return {
      categoryId: null,
      categoryName: name,
      customCategory: true
    }
  }
}

export const expenseCategoriesService = new ExpenseCategoriesService()
export const expensesService = new ExpensesService()
