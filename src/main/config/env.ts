import { config as loadEnv } from 'dotenv'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

let loaded = false

export function loadMainEnv(rootPath: string): void {
  if (loaded) return

  const envPath = join(rootPath, '.env')
  if (existsSync(envPath)) {
    loadEnv({ path: envPath })
  }

  loaded = true
}

export function getDevMongoDbUrl(): string | undefined {
  return process.env.MONGODB_URL?.trim() || undefined
}
