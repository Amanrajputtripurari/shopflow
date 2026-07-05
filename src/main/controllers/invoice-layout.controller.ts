import { ipcMain } from 'electron'

import { IPC_CHANNELS } from '@shared/ipc-channels'
import type { InvoiceLayoutInput } from '@shared/types/invoice-layout'
import { adminHandler, secureHandler, success } from '../helpers/secure-ipc'
import { invoiceLayoutService } from '../services/invoice-layout.service'

export function registerInvoiceLayoutController(): void {
  ipcMain.handle(
    IPC_CHANNELS.INVOICE_LAYOUTS_LIST,
    secureHandler(IPC_CHANNELS.INVOICE_LAYOUTS_LIST, async (user) => {
      return success(await invoiceLayoutService.list(user))
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.INVOICE_LAYOUTS_GET,
    secureHandler(IPC_CHANNELS.INVOICE_LAYOUTS_GET, async (user, id: string) => {
      return success(await invoiceLayoutService.get(user, id))
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.INVOICE_LAYOUTS_CREATE,
    adminHandler(IPC_CHANNELS.INVOICE_LAYOUTS_CREATE, async (user, input: InvoiceLayoutInput) => {
      return success(await invoiceLayoutService.create(user, input))
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.INVOICE_LAYOUTS_UPDATE,
    adminHandler(IPC_CHANNELS.INVOICE_LAYOUTS_UPDATE, async (user, id: string, input: InvoiceLayoutInput) => {
      return success(await invoiceLayoutService.update(user, id, input))
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.INVOICE_LAYOUTS_DELETE,
    adminHandler(IPC_CHANNELS.INVOICE_LAYOUTS_DELETE, async (user, id: string) => {
      await invoiceLayoutService.delete(user, id)
      return success(null)
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.INVOICE_LAYOUTS_DUPLICATE,
    adminHandler(IPC_CHANNELS.INVOICE_LAYOUTS_DUPLICATE, async (user, id: string, name: string) => {
      return success(await invoiceLayoutService.duplicate(user, id, name))
    })
  )
}
