import { ipcMain } from 'electron'

import { IPC_CHANNELS } from '@shared/ipc-channels'
import type { GenerateBillInput } from '@shared/types/order'
import { secureHandler, success } from '../helpers/secure-ipc'
import { billingService } from '../services/billing.service'

export function registerBillingController(): void {
  ipcMain.handle(
    IPC_CHANNELS.BILLING_GENERATE,
    secureHandler(IPC_CHANNELS.BILLING_GENERATE, async (user, input: GenerateBillInput) => {
      return success(await billingService.generateBill(user, input))
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.BILLING_OPEN,
    secureHandler(IPC_CHANNELS.BILLING_OPEN, async (_user, filePath: string) => {
      await billingService.openBill(filePath)
      return success(null)
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.BILLING_DOWNLOAD,
    secureHandler(IPC_CHANNELS.BILLING_DOWNLOAD, async (_user, filePath: string, suggestedName?: string) => {
      return success(await billingService.downloadBill(filePath, suggestedName))
    })
  )
}
