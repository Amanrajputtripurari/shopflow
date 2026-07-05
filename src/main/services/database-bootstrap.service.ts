import { SETTINGS_EVENTS } from '@shared/events'
import type { ChangeConnectionInput } from '@shared/types/backup'
import type { DbStatus, SetupInput } from '@shared/types/settings'
import { bootstrapAdminUser } from '../database/seeds/bootstrap-admin'
import { disconnectMongo } from '../database/connection'
import { getDatabaseStatus, reconnectDatabase, testConnection } from '../database/health'
import { runMigrations } from '../database/index-manager'
import { eventBus } from '../events/event-bus'
import type { CryptoStore } from '../helpers/crypto-store'
import { clearAllSessions } from '../helpers/session-store'
import { companyRepository } from '../repositories/company.repository'
import { settingsRepository } from '../repositories/settings.repository'

async function applyDatabaseBootstrap(
  cryptoStore: CryptoStore,
  mongodbUrl: string,
  companyName: string,
  admin: SetupInput['admin']
): Promise<DbStatus> {
  const trimmedUrl = mongodbUrl.trim()
  const trimmedCompany = companyName.trim()

  if (!trimmedUrl) {
    throw new Error('MongoDB connection URL is required.')
  }
  if (!trimmedCompany) {
    throw new Error('Company name is required.')
  }

  await testConnection(trimmedUrl)
  cryptoStore.setMongoDbUrl(trimmedUrl)
  await disconnectMongo()
  await reconnectDatabase(trimmedUrl)
  await runMigrations()

  const settings = await settingsRepository.saveSettings({
    setupComplete: true,
    companyName: trimmedCompany
  })

  await companyRepository.saveProfile({ name: trimmedCompany })
  await bootstrapAdminUser({ ...admin, role: 'admin' })

  clearAllSessions()
  eventBus.emit(SETTINGS_EVENTS.UPDATED, settings)

  return getDatabaseStatus()
}

export async function changeConnectionUrl(
  cryptoStore: CryptoStore,
  input: ChangeConnectionInput
): Promise<DbStatus> {
  return applyDatabaseBootstrap(cryptoStore, input.mongodbUrl, input.companyName, input.admin)
}

export async function completeDatabaseSetup(
  cryptoStore: CryptoStore,
  input: SetupInput
): Promise<import('@shared/types/settings').AppSettings> {
  await applyDatabaseBootstrap(cryptoStore, input.mongodbUrl, input.companyName, input.admin)
  return settingsRepository.getSettings()
}
