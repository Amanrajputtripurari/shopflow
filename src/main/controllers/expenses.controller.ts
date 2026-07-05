import { ipcMain } from 'electron'

import { IPC_CHANNELS } from '@shared/ipc-channels'
import type { ExpenseCategoryInput, ExpenseInput, ExpenseListFilters } from '@shared/types/expense'
import { adminHandler, secureHandler, success } from '../helpers/secure-ipc'
import { expenseCategoriesService, expensesService } from '../services/expenses.service'

export function registerExpensesController(): void {
  ipcMain.handle(
    IPC_CHANNELS.EXPENSE_CATEGORIES_LIST,
    secureHandler(IPC_CHANNELS.EXPENSE_CATEGORIES_LIST, async () => {
      return success(await expenseCategoriesService.list())
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.EXPENSE_CATEGORIES_CREATE,
    adminHandler(IPC_CHANNELS.EXPENSE_CATEGORIES_CREATE, async (user, input: ExpenseCategoryInput) => {
      return success(await expenseCategoriesService.create(user, input))
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.EXPENSE_CATEGORIES_UPDATE,
    adminHandler(IPC_CHANNELS.EXPENSE_CATEGORIES_UPDATE, async (user, id: string, input: ExpenseCategoryInput) => {
      return success(await expenseCategoriesService.update(user, id, input))
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.EXPENSE_CATEGORIES_DELETE,
    adminHandler(IPC_CHANNELS.EXPENSE_CATEGORIES_DELETE, async (user, id: string) => {
      await expenseCategoriesService.delete(user, id)
      return success(null)
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.EXPENSES_LIST,
    secureHandler(IPC_CHANNELS.EXPENSES_LIST, async (_user, filters: ExpenseListFilters = {}) => {
      return success(await expensesService.list(filters))
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.EXPENSES_CREATE,
    secureHandler(IPC_CHANNELS.EXPENSES_CREATE, async (user, input: ExpenseInput) => {
      return success(await expensesService.create(user, input))
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.EXPENSES_UPDATE,
    adminHandler(IPC_CHANNELS.EXPENSES_UPDATE, async (user, id: string, input: ExpenseInput) => {
      return success(await expensesService.update(user, id, input))
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.EXPENSES_DELETE,
    adminHandler(IPC_CHANNELS.EXPENSES_DELETE, async (user, id: string) => {
      await expensesService.delete(user, id)
      return success(null)
    })
  )
}
