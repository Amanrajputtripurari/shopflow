import {
  connectMongo,
  disconnectMongo,
  getDatabaseName,
  getLastConnectionError,
  isConnected,
  pingMongo,
  setLastConnectionError,
  testMongoConnection
} from './connection'
import { DB_EVENTS } from '@shared/events'
import type { DbStatus } from '@shared/types/settings'
import { eventBus } from '../events/event-bus'
import { logger } from '../helpers/logger'

export async function initializeDatabase(url: string): Promise<void> {
  try {
    await connectMongo(url)
    eventBus.emit(DB_EVENTS.CONNECTED, undefined)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Connection failed'
    setLastConnectionError(message)
    eventBus.emit(DB_EVENTS.ERROR, message)
    logger.error('MongoDB initialization failed', error)
    throw error
  }
}

export async function reconnectDatabase(url: string): Promise<void> {
  await disconnectMongo()
  await initializeDatabase(url)
}

export async function testConnection(url: string): Promise<{ databaseName: string; latencyMs: number }> {
  return testMongoConnection(url)
}

export async function getDatabaseStatus(): Promise<DbStatus> {
  const lastCheckedAt = new Date().toISOString()

  if (!isConnected()) {
    return {
      connected: false,
      databaseName: null,
      latencyMs: null,
      error: getLastConnectionError() ?? 'Not connected',
      lastCheckedAt
    }
  }

  try {
    const latencyMs = await pingMongo()
    return {
      connected: true,
      databaseName: getDatabaseName(),
      latencyMs,
      error: null,
      lastCheckedAt
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Health check failed'
    setLastConnectionError(message)
    eventBus.emit(DB_EVENTS.ERROR, message)
    return {
      connected: false,
      databaseName: getDatabaseName(),
      latencyMs: null,
      error: message,
      lastCheckedAt
    }
  }
}
