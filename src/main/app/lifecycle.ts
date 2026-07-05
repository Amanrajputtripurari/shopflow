import { app, BrowserWindow } from 'electron'

import { getDevMongoDbUrl, loadMainEnv } from '../config/env'
import { registerAllControllers } from '../controllers/register-all'
import { CryptoStore } from '../helpers/crypto-store'
import { logger } from '../helpers/logger'
import { DatabaseService, SettingsService } from '../services/settings.service'
import { createMainWindow, getMainWindow } from './window-manager'
import { whatsappService } from '../services/whatsapp.service'

const gotSingleInstanceLock = app.requestSingleInstanceLock()

if (!gotSingleInstanceLock) {
  app.quit()
}

export async function bootstrapApp(): Promise<void> {
  loadMainEnv(process.cwd())

  const userDataPath = app.getPath('userData')
  const cryptoStore = new CryptoStore(userDataPath)
  const databaseService = new DatabaseService(cryptoStore)
  const settingsService = new SettingsService(cryptoStore, databaseService)

  registerAllControllers(databaseService, settingsService, cryptoStore, userDataPath, getMainWindow)

  try {
    await databaseService.bootstrapFromStore(getDevMongoDbUrl())
  } catch (error) {
    logger.warn('Startup database connection skipped or failed', error)
  }

  createMainWindow(userDataPath)
  whatsappService.initialize(userDataPath, getMainWindow)
}

export function registerAppLifecycle(): void {
  app.on('second-instance', () => {
    const window = getMainWindow()
    if (window) {
      if (window.isMinimized()) window.restore()
      window.focus()
    }
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow(app.getPath('userData'))
    }
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
}
