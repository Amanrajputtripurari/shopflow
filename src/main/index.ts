import { app } from 'electron'

import { bootstrapApp, registerAppLifecycle } from './app/lifecycle'
import { logger } from './helpers/logger'

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception in main process', error)
})

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection in main process', reason)
})

registerAppLifecycle()

app.whenReady().then(async () => {
  await bootstrapApp()
})
