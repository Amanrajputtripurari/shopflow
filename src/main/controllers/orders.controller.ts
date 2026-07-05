import { ipcMain } from 'electron'

import { IPC_CHANNELS } from '@shared/ipc-channels'
import type { OrderInput, OrderListFilters, OrderStatus } from '@shared/types/order'
import { secureHandler, success } from '../helpers/secure-ipc'
import { ordersService } from '../services/orders.service'

export function registerOrdersController(): void {
  ipcMain.handle(
    IPC_CHANNELS.ORDERS_LIST,
    secureHandler(IPC_CHANNELS.ORDERS_LIST, async (_user, filters: OrderListFilters = {}) => {
      return success(await ordersService.list(filters))
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.ORDERS_LIST_STATS,
    secureHandler(IPC_CHANNELS.ORDERS_LIST_STATS, async (_user, filters: OrderListFilters = {}) => {
      return success(await ordersService.listStats(filters))
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.ORDERS_GET,
    secureHandler(IPC_CHANNELS.ORDERS_GET, async (_user, id: string) => {
      return success(await ordersService.get(id))
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.ORDERS_CREATE,
    secureHandler(IPC_CHANNELS.ORDERS_CREATE, async (user, input: OrderInput) => {
      return success(await ordersService.create(user, input))
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.ORDERS_UPDATE,
    secureHandler(IPC_CHANNELS.ORDERS_UPDATE, async (user, id: string, input: OrderInput) => {
      return success(await ordersService.update(user, id, input))
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.ORDERS_UPDATE_STATUS,
    secureHandler(IPC_CHANNELS.ORDERS_UPDATE_STATUS, async (user, id: string, status: OrderStatus) => {
      return success(await ordersService.updateStatus(user, id, status))
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.DASHBOARD_STATS,
    secureHandler(IPC_CHANNELS.DASHBOARD_STATS, async () => {
      return success(await ordersService.getDashboardStats())
    })
  )
}
