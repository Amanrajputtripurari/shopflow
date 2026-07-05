import { ipcMain } from 'electron'

import { IPC_CHANNELS } from '@shared/ipc-channels'
import type { CustomerInput, CustomerListFilters, CustomerSearchQuery } from '@shared/types/customer'
import { adminHandler, secureHandler, success } from '../helpers/secure-ipc'
import { customersService } from '../services/customers.service'

export function registerCustomersController(): void {
  ipcMain.handle(
    IPC_CHANNELS.CUSTOMERS_LIST,
    secureHandler(IPC_CHANNELS.CUSTOMERS_LIST, async (_user, filters: CustomerListFilters = {}) => {
      return success(await customersService.list(filters))
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.CUSTOMERS_SEARCH,
    secureHandler(IPC_CHANNELS.CUSTOMERS_SEARCH, async (_user, query?: CustomerSearchQuery) => {
      return success(await customersService.search(query))
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.CUSTOMERS_GET,
    secureHandler(IPC_CHANNELS.CUSTOMERS_GET, async (_user, id: string) => {
      return success(await customersService.get(id))
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.CUSTOMERS_CREATE,
    secureHandler(IPC_CHANNELS.CUSTOMERS_CREATE, async (user, input: CustomerInput) => {
      return success(await customersService.create(user, input))
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.CUSTOMERS_UPDATE,
    secureHandler(IPC_CHANNELS.CUSTOMERS_UPDATE, async (user, id: string, input: CustomerInput) => {
      return success(await customersService.update(user, id, input))
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.CUSTOMERS_DELETE,
    adminHandler(IPC_CHANNELS.CUSTOMERS_DELETE, async (user, id: string) => {
      await customersService.delete(user, id)
      return success(null)
    })
  )
}
