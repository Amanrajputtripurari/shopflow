import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const isElectron = Boolean(process.versions.electron)
const require = createRequire(import.meta.url)

type LogFn = (message: string, meta?: unknown) => void

function createConsoleLogger(): {
  debug: LogFn
  info: LogFn
  warn: LogFn
  error: LogFn
} {
  return {
    debug: (message, meta) => console.debug(message, meta ?? ''),
    info: (message, meta) => console.info(message, meta ?? ''),
    warn: (message, meta) => console.warn(message, meta ?? ''),
    error: (message, meta) => console.error(message, meta ?? '')
  }
}

function createElectronLogger(): {
  debug: LogFn
  info: LogFn
  warn: LogFn
  error: LogFn
} {
  const log = require('electron-log') as typeof import('electron-log').default
  const { app } = require('electron') as typeof import('electron')

  log.transports.file.level = 'info'
  log.transports.console.level = app.isPackaged ? 'warn' : 'debug'
  log.transports.file.resolvePathFn = () => join(app.getPath('userData'), 'logs', 'main.log')

  return {
    debug: (message, meta) => log.debug(message, meta),
    info: (message, meta) => log.info(message, meta),
    warn: (message, meta) => log.warn(message, meta),
    error: (message, meta) => log.error(message, meta)
  }
}

export const logger = isElectron ? createElectronLogger() : createConsoleLogger()

export function getLogsDirectory(): string {
  if (isElectron) {
    const { app } = require('electron') as typeof import('electron')
    return join(app.getPath('userData'), 'logs')
  }

  const dir = join(tmpdir(), 'shopflow-logs')
  mkdirSync(dir, { recursive: true })
  return dir
}
