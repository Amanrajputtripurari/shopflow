import { MongoClient, type Db } from 'mongodb'

import { logger } from '../helpers/logger'

let client: MongoClient | null = null
let db: Db | null = null
let lastError: string | null = null

export async function connectMongo(url: string): Promise<Db> {
  await disconnectMongo()

  const nextClient = new MongoClient(url, {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000
  })

  await nextClient.connect()
  client = nextClient
  db = nextClient.db()
  lastError = null

  logger.info('MongoDB connected', { databaseName: db.databaseName })
  return db
}

export async function disconnectMongo(): Promise<void> {
  if (client) {
    await client.close()
    logger.info('MongoDB disconnected')
  }

  client = null
  db = null
}

export function getDb(): Db {
  if (!db) {
    throw new Error('MongoDB is not connected.')
  }

  return db
}

export function isConnected(): boolean {
  return db !== null && client !== null
}

export function getDatabaseName(): string | null {
  return db?.databaseName ?? null
}

export function setLastConnectionError(message: string): void {
  lastError = message
}

export function getLastConnectionError(): string | null {
  return lastError
}

export async function pingMongo(): Promise<number> {
  const database = getDb()
  const started = Date.now()
  await database.command({ ping: 1 })
  return Date.now() - started
}

export async function testMongoConnection(
  url: string
): Promise<{ databaseName: string; latencyMs: number }> {
  const testClient = new MongoClient(url, {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000
  })

  try {
    await testClient.connect()
    const database = testClient.db()
    const started = Date.now()
    await database.command({ ping: 1 })
    const latencyMs = Date.now() - started
    return { databaseName: database.databaseName, latencyMs }
  } finally {
    await testClient.close()
  }
}
