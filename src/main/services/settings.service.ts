import { SETTINGS_EVENTS } from '@shared/events'
import type { AppSettings, AppSettingsInput, SetupInput } from '@shared/types/settings'
import { isConnected } from '../database/connection'
import { getDatabaseStatus, initializeDatabase, testConnection } from '../database/health'
import { runMigrations } from '../database/index-manager'
import { eventBus } from '../events/event-bus'
import { CryptoStore } from '../helpers/crypto-store'
import { settingsRepository } from '../repositories/settings.repository'
import { completeDatabaseSetup } from './database-bootstrap.service'

export class DatabaseService {
  constructor(private readonly cryptoStore: CryptoStore) {}

  async bootstrapFromStore(devUrl?: string): Promise<void> {
    const url = this.cryptoStore.getMongoDbUrl() ?? devUrl
    if (!url) {
      return
    }

    await initializeDatabase(url)
    await runMigrations()
  }

  async testConnection(url: string) {
    return testConnection(url)
  }

  async getStatus() {
    return getDatabaseStatus()
  }

  getStoredUrlExists(): boolean {
    return this.cryptoStore.getMongoDbUrl() !== null
  }
}

export class SettingsService {
  constructor(
    private readonly cryptoStore: CryptoStore,
    private readonly databaseService: DatabaseService
  ) {}

  async getSettings(): Promise<AppSettings> {
    if (!isConnected()) {
      return {
        setupComplete: false,
        companyName: '',
        theme: 'system',
        themeColor: 'default'
      }
    }

    return settingsRepository.getSettings()
  }

  async saveSettings(input: AppSettingsInput): Promise<AppSettings> {
    const settings = await settingsRepository.saveSettings({
      companyName: input.companyName,
      theme: input.theme,
      themeColor: input.themeColor
    })

    eventBus.emit(SETTINGS_EVENTS.UPDATED, settings)
    return settings
  }

  async completeSetup(input: SetupInput): Promise<AppSettings> {
    return completeDatabaseSetup(this.cryptoStore, input)
  }
}
