import { APP_SETTINGS_ID, COLLECTIONS } from '@shared/constants/database'
import type { AppSettings, AppSettingsDocument, ThemeColor, ThemeMode } from '@shared/types/settings'
import { BaseRepository } from './base.repository'

function toDto(document: AppSettingsDocument): AppSettings {
  return {
    setupComplete: document.setupComplete,
    companyName: document.companyName,
    theme: document.theme ?? 'system',
    themeColor: document.themeColor ?? 'default'
  }
}

export class SettingsRepository extends BaseRepository<AppSettingsDocument> {
  constructor() {
    super(COLLECTIONS.APP_SETTINGS)
  }

  async getSettings(): Promise<AppSettings> {
    const document = await this.findOne({ _id: APP_SETTINGS_ID })
    if (!document) {
      throw new Error('Application settings not initialized.')
    }
    return toDto(document)
  }

  async saveSettings(
    input: Partial<Pick<AppSettingsDocument, 'companyName' | 'theme' | 'themeColor' | 'setupComplete'>>
  ): Promise<AppSettings> {
    const updatedAt = new Date()

    const setOnInsert: Omit<AppSettingsDocument, 'updatedAt'> = {
      _id: APP_SETTINGS_ID,
      setupComplete: false,
      companyName: '',
      theme: 'system' as ThemeMode,
      themeColor: 'default' as ThemeColor
    }

    // MongoDB rejects the same path in both $set and $setOnInsert
    for (const key of Object.keys(input) as Array<keyof typeof input>) {
      delete setOnInsert[key]
    }

    await this.updateOne(
      { _id: APP_SETTINGS_ID },
      {
        $set: {
          ...input,
          updatedAt
        },
        $setOnInsert: setOnInsert
      }
    )

    return this.getSettings()
  }
}

export const settingsRepository = new SettingsRepository()
