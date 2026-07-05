import { BrowserWindow, nativeImage, shell } from 'electron'
import { join } from 'node:path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'

import { logger } from '../helpers/logger'

interface WindowState {
  width: number
  height: number
  x?: number
  y?: number
  isMaximized: boolean
}

const DEFAULT_STATE: WindowState = {
  width: 1280,
  height: 800,
  isMaximized: false
}

let mainWindow: BrowserWindow | null = null

function getStatePath(userDataPath: string): string {
  const dir = join(userDataPath, 'window-state')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return join(dir, 'main.json')
}

function readWindowState(userDataPath: string): WindowState {
  const path = getStatePath(userDataPath)
  if (!existsSync(path)) {
    return DEFAULT_STATE
  }

  try {
    return { ...DEFAULT_STATE, ...JSON.parse(readFileSync(path, 'utf-8')) }
  } catch {
    return DEFAULT_STATE
  }
}

function saveWindowState(userDataPath: string, window: BrowserWindow): void {
  const isMaximized = window.isMaximized()
  const bounds = isMaximized ? window.getNormalBounds() : window.getBounds()

  const state: WindowState = {
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    isMaximized
  }

  writeFileSync(getStatePath(userDataPath), JSON.stringify(state, null, 2), 'utf-8')
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

function getPreloadPath(): string {
  const jsPath = join(__dirname, '../preload/index.js')
  const mjsPath = join(__dirname, '../preload/index.mjs')
  return existsSync(jsPath) ? jsPath : mjsPath
}

function getWindowIconPath(): string | undefined {
  const candidates = [
    join(process.cwd(), 'build/icon.png'),
    join(__dirname, '../../../build/icon.png')
  ]
  return candidates.find((path) => existsSync(path))
}

export function createMainWindow(userDataPath: string): BrowserWindow {
  const state = readWindowState(userDataPath)
  const iconPath = getWindowIconPath()
  const icon = iconPath ? nativeImage.createFromPath(iconPath) : undefined

  mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: 960,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    ...(icon && !icon.isEmpty() ? { icon } : {}),
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  if (state.isMaximized) {
    mainWindow.maximize()
  }

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('close', () => {
    if (mainWindow) {
      saveWindowState(userDataPath, mainWindow)
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  logger.info('Main window created')
  return mainWindow
}
