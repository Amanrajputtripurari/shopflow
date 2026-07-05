import { safeStorage } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { logger } from './logger'

const STORE_DIR = 'secure'
const STORE_FILE = 'credentials.json'

interface CredentialStore {
  mongodbUrl?: string
}

function getStorePath(userDataPath: string): string {
  const dir = join(userDataPath, STORE_DIR)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return join(dir, STORE_FILE)
}

function readStore(userDataPath: string): CredentialStore {
  const path = getStorePath(userDataPath)
  if (!existsSync(path)) {
    return {}
  }

  try {
    const raw = readFileSync(path, 'utf-8')
    const parsed = JSON.parse(raw) as { mongodbUrl?: string; mongodbUrlEnc?: string }

    if (parsed.mongodbUrlEnc && safeStorage.isEncryptionAvailable()) {
      const buffer = Buffer.from(parsed.mongodbUrlEnc, 'base64')
      return { mongodbUrl: safeStorage.decryptString(buffer) }
    }

    return { mongodbUrl: parsed.mongodbUrl }
  } catch (error) {
    logger.error('Failed to read credential store', error)
    return {}
  }
}

function writeStore(userDataPath: string, store: CredentialStore): void {
  const path = getStorePath(userDataPath)

  if (store.mongodbUrl && safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(store.mongodbUrl)
    writeFileSync(
      path,
      JSON.stringify({ mongodbUrlEnc: encrypted.toString('base64') }, null, 2),
      'utf-8'
    )
    return
  }

  writeFileSync(path, JSON.stringify({ mongodbUrl: store.mongodbUrl }, null, 2), 'utf-8')
}

export class CryptoStore {
  constructor(private readonly userDataPath: string) {}

  getMongoDbUrl(): string | null {
    return readStore(this.userDataPath).mongodbUrl ?? null
  }

  setMongoDbUrl(url: string): void {
    writeStore(this.userDataPath, { mongodbUrl: url })
  }

  clearMongoDbUrl(): void {
    writeStore(this.userDataPath, {})
  }
}
