import { ipcMain } from 'electron'

import { IPC_CHANNELS } from '@shared/ipc-channels'
import type { ProductInput, ProductListFilters } from '@shared/types/product'
import { adminHandler, secureHandler, success } from '../helpers/secure-ipc'
import { productsService } from '../services/products.service'

export function registerProductsController(): void {
  ipcMain.handle(
    IPC_CHANNELS.PRODUCTS_LIST,
    secureHandler(IPC_CHANNELS.PRODUCTS_LIST, async (_user, filters: ProductListFilters = {}) => {
      return success(await productsService.list(filters))
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.PRODUCTS_GET,
    secureHandler(IPC_CHANNELS.PRODUCTS_GET, async (_user, id: string) => {
      return success(await productsService.get(id))
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.PRODUCTS_CREATE,
    secureHandler(IPC_CHANNELS.PRODUCTS_CREATE, async (user, input: ProductInput) => {
      return success(await productsService.create(user, input))
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.PRODUCTS_UPDATE,
    secureHandler(IPC_CHANNELS.PRODUCTS_UPDATE, async (user, id: string, input: ProductInput) => {
      return success(await productsService.update(user, id, input))
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.PRODUCTS_DELETE,
    adminHandler(IPC_CHANNELS.PRODUCTS_DELETE, async (user, id: string) => {
      await productsService.delete(user, id)
      return success(null)
    })
  )
}
