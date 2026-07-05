import { app, ipcMain, shell } from 'electron'

import { IPC_CHANNELS, IPC_EVENTS } from '@shared/ipc-channels'
import type { AppSettingsInput, SetupInput } from '@shared/types/settings'
import { DB_EVENTS, SETTINGS_EVENTS } from '@shared/events'
import { registerAuthController } from './auth.controller'
import { registerCompanyController } from './company.controller'
import { registerCustomersController } from './customers.controller'
import { registerBillingController } from './billing.controller'
import { registerInvoiceLayoutController } from './invoice-layout.controller'
import { registerLedgerController } from './ledger.controller'
import { registerOrdersController } from './orders.controller'
import { registerProductsController } from './products.controller'
import { registerExpensesController } from './expenses.controller'
import { registerReportsController } from './reports.controller'
import { registerStockController } from './stock.controller'
import { registerWhatsAppController } from './whatsapp.controller'
import { eventBus } from '../events/event-bus'
import { getLogsDirectory } from '../helpers/logger'
import { failure, ipcWrapper, success } from '../helpers/ipc-wrapper'
import { registerBackupController } from './backup.controller'
import type { CryptoStore } from '../helpers/crypto-store'
import { BackupService } from '../services/backup.service'
import type { DatabaseService, SettingsService } from '../services/settings.service'
import type { BrowserWindow } from 'electron'

export function registerDatabaseController(
  databaseService: DatabaseService,
  getMainWindow: () => BrowserWindow | null
): void {
  ipcMain.handle(
    IPC_CHANNELS.DB_TEST_CONNECTION,
    ipcWrapper(IPC_CHANNELS.DB_TEST_CONNECTION, async (_event, url: string) => {
      if (!url?.trim()) {
        return failure(new Error('MongoDB connection URL is required.'))
      }

      const result = await databaseService.testConnection(url.trim())
      return success(result)
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.DB_GET_STATUS,
    ipcWrapper(IPC_CHANNELS.DB_GET_STATUS, async () => {
      const status = await databaseService.getStatus()
      return success(status)
    })
  )

  eventBus.on(DB_EVENTS.CONNECTED, () => {
    void pushDbStatus(getMainWindow, databaseService)
  })

  eventBus.on(DB_EVENTS.ERROR, () => {
    void pushDbStatus(getMainWindow, databaseService)
  })
}

export function registerSettingsController(
  settingsService: SettingsService,
  getMainWindow: () => BrowserWindow | null
): void {
  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_GET,
    ipcWrapper(IPC_CHANNELS.SETTINGS_GET, async () => {
      const settings = await settingsService.getSettings()
      return success(settings)
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_SAVE,
    ipcWrapper(IPC_CHANNELS.SETTINGS_SAVE, async (_event, input: AppSettingsInput) => {
      const settings = await settingsService.saveSettings(input)
      return success(settings)
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.SETUP_COMPLETE,
    ipcWrapper(IPC_CHANNELS.SETUP_COMPLETE, async (_event, input: SetupInput) => {
      const settings = await settingsService.completeSetup(input)
      return success(settings)
    })
  )

  eventBus.on(SETTINGS_EVENTS.UPDATED, () => {
    getMainWindow()?.webContents.send(IPC_EVENTS.SETTINGS_UPDATED)
  })
}

export function registerAppController(): void {
  ipcMain.handle(
    IPC_CHANNELS.APP_GET_VERSION,
    ipcWrapper(IPC_CHANNELS.APP_GET_VERSION, async () => {
      return success(app.getVersion())
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.APP_OPEN_LOGS,
    ipcWrapper(IPC_CHANNELS.APP_OPEN_LOGS, async () => {
      await shell.openPath(getLogsDirectory())
      return success(null)
    })
  )
}

async function pushDbStatus(
  getMainWindow: () => BrowserWindow | null,
  databaseService: DatabaseService
): Promise<void> {
  const status = await databaseService.getStatus()
  getMainWindow()?.webContents.send(IPC_EVENTS.DB_STATUS_CHANGED, status)
}

export function registerAllControllers(
  databaseService: DatabaseService,
  settingsService: SettingsService,
  cryptoStore: CryptoStore,
  userDataPath: string,
  getMainWindow: () => BrowserWindow | null
): void {
  const backupService = new BackupService(userDataPath, getMainWindow, cryptoStore)

  registerDatabaseController(databaseService, getMainWindow)
  registerSettingsController(settingsService, getMainWindow)
  registerBackupController(backupService, cryptoStore)
  registerAppController()
  registerAuthController()
  registerCompanyController()
  registerProductsController()
  registerCustomersController()
  registerOrdersController()
  registerBillingController()
  registerInvoiceLayoutController()
  registerLedgerController()
  registerStockController()
  registerExpensesController()
  registerReportsController()
  registerWhatsAppController()
}
