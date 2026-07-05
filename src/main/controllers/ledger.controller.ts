import { ipcMain } from 'electron'

import { IPC_CHANNELS } from '@shared/ipc-channels'
import type { RecordPaymentInput, SettleCreditInput } from '@shared/types/ledger'
import { adminHandler, secureHandler, success } from '../helpers/secure-ipc'
import { ledgerService } from '../services/ledger.service'

export function registerLedgerController(): void {
  ipcMain.handle(
    IPC_CHANNELS.LEDGER_LIST,
    secureHandler(IPC_CHANNELS.LEDGER_LIST, async (_user, customerId: string) => {
      return success(await ledgerService.listByCustomer(customerId))
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.LEDGER_RECORD_PAYMENT,
    secureHandler(IPC_CHANNELS.LEDGER_RECORD_PAYMENT, async (user, input: RecordPaymentInput) => {
      await ledgerService.recordOrderPayment(user, input)
      return success(null)
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.LEDGER_SETTLE,
    adminHandler(IPC_CHANNELS.LEDGER_SETTLE, async (user, input: SettleCreditInput) => {
      return success(await ledgerService.settleCredit(user, input))
    })
  )
}
