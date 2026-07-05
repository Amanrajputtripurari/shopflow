import { ipcMain } from 'electron'

import { IPC_CHANNELS } from '@shared/ipc-channels'
import type { StockAdjustInput } from '@shared/types/product'
import { adminHandler, secureHandler, success } from '../helpers/secure-ipc'
import { stockService } from '../services/stock.service'

export function registerStockController(): void {
  ipcMain.handle(
    IPC_CHANNELS.STOCK_ADJUST,
    adminHandler(IPC_CHANNELS.STOCK_ADJUST, async (_user, input: StockAdjustInput) => {
      await stockService.adjustStock(input.productId, input.quantity)
      return success(null)
    })
  )
}
