import { access } from 'node:fs/promises'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { app, dialog, shell, type BrowserWindow } from 'electron'
import { EJSON, type Document } from 'bson'

import { SCHEMA_VERSION } from '@shared/constants/database'
import {
  BACKUP_FORMAT_VERSION,
  type BackupHistoryEntry,
  type BackupManifest,
  type BackupResult,
  type BackupSettings,
  type RestoreHistoryEntry,
  type RestoreResult
} from '@shared/types/backup'
import { disconnectMongo, getDatabaseName, getDb, isConnected } from '../database/connection'
import { reconnectDatabase } from '../database/health'
import { runMigrations } from '../database/index-manager'
import type { CryptoStore } from '../helpers/crypto-store'
import { LocalPreferencesStore } from '../helpers/local-preferences'
import { logger } from '../helpers/logger'

const MANIFEST_FILE = 'manifest.json'
const INSERT_BATCH_SIZE = 500

export class BackupService {
  private readonly prefs: LocalPreferencesStore

  constructor(
    private readonly userDataPath: string,
    private readonly getMainWindow: () => BrowserWindow | null,
    private readonly cryptoStore: CryptoStore
  ) {
    this.prefs = new LocalPreferencesStore(userDataPath)
  }

  getBackupSettings(): BackupSettings {
    return this.prefs.getBackupSettings()
  }

  async pickBackupFolder(): Promise<string | null> {
    const current = this.prefs.getBackupSettings().backupFolderPath
    const picked = await this.pickDirectory('Choose default backup folder', current ?? undefined)
    if (!picked) {
      return null
    }

    this.prefs.setBackupFolderPath(picked)
    return picked
  }

  async clearBackupFolder(): Promise<void> {
    this.prefs.setBackupFolderPath(null)
  }

  async openBackupFolder(): Promise<void> {
    const folder = this.prefs.getBackupSettings().backupFolderPath
    if (!folder) {
      throw new Error('No backup folder is configured.')
    }

    await access(folder)
    const result = await shell.openPath(folder)
    if (result) {
      throw new Error(result)
    }
  }

  async backup(): Promise<BackupResult> {
    if (!isConnected()) {
      throw new Error('MongoDB is not connected. Connect before creating a backup.')
    }

    const startedAt = Date.now()
    let parentDir = this.prefs.getBackupSettings().backupFolderPath

    if (!parentDir) {
      parentDir = await this.pickDirectory('Choose folder for MongoDB backup')
      if (!parentDir) {
        throw new Error('Backup cancelled.')
      }
      this.prefs.setBackupFolderPath(parentDir)
    }

    try {
      await access(parentDir)
    } catch {
      throw new Error('Backup folder is not accessible. Choose a new folder in settings.')
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const folderPath = join(parentDir, `shopflow-backup-${timestamp}`)
    await mkdir(folderPath, { recursive: true })

    const db = getDb()
    const databaseName = getDatabaseName() ?? db.databaseName
    const collectionInfos = await db.listCollections({}, { nameOnly: true }).toArray()
    const collectionNames = collectionInfos
      .map((info) => info.name)
      .filter((name): name is string => Boolean(name) && !name.startsWith('system.'))
      .sort()

    let documentCount = 0
    const manifestCollections: BackupManifest['collections'] = []

    for (const name of collectionNames) {
      const docs = await db.collection(name).find({}).toArray()
      documentCount += docs.length
      manifestCollections.push({ name, count: docs.length })
      await writeFile(join(folderPath, `${name}.json`), EJSON.stringify(docs, { relaxed: false }), 'utf8')
      logger.info('Backup collection exported', { name, count: docs.length })
    }

    const createdAt = new Date().toISOString()
    const durationMs = Date.now() - startedAt
    const manifest: BackupManifest = {
      backupFormatVersion: BACKUP_FORMAT_VERSION,
      schemaVersion: SCHEMA_VERSION,
      appVersion: app.getVersion(),
      databaseName,
      createdAt,
      collections: manifestCollections
    }

    await writeFile(join(folderPath, MANIFEST_FILE), JSON.stringify(manifest, null, 2), 'utf8')

    const result: BackupResult = {
      folderPath,
      databaseName,
      collectionCount: manifestCollections.length,
      documentCount,
      createdAt,
      durationMs
    }

    const history: BackupHistoryEntry = {
      at: createdAt,
      durationMs,
      folderPath,
      databaseName,
      collectionCount: result.collectionCount,
      documentCount: result.documentCount
    }
    this.prefs.saveLastBackup(history)

    return result
  }

  async restore(): Promise<RestoreResult> {
    const startedAt = Date.now()
    const defaultPath = this.prefs.getBackupSettings().backupFolderPath ?? undefined
    const folderPath = await this.pickDirectory('Choose backup folder to restore', defaultPath)
    if (!folderPath) {
      throw new Error('Restore cancelled.')
    }

    const manifest = await this.readManifest(folderPath)
    const confirmed = await this.confirmRestore(manifest.databaseName)
    if (!confirmed) {
      throw new Error('Restore cancelled.')
    }

    const storedUrl = this.cryptoStore.getMongoDbUrl()
    if (!storedUrl) {
      throw new Error('No MongoDB connection URL is stored. Set a connection URL first.')
    }

    if (!isConnected()) {
      await reconnectDatabase(storedUrl)
    }

    const db = getDb()
    let documentCount = 0

    for (const entry of manifest.collections) {
      const filePath = join(folderPath, `${entry.name}.json`)
      let raw: string
      try {
        raw = await readFile(filePath, 'utf8')
      } catch {
        throw new Error(`Missing backup file for collection "${entry.name}".`)
      }

      const docs = EJSON.parse(raw) as Document[]
      if (!Array.isArray(docs)) {
        throw new Error(`Invalid backup file for collection "${entry.name}".`)
      }

      const collection = db.collection(entry.name)
      await collection.deleteMany({})

      for (let offset = 0; offset < docs.length; offset += INSERT_BATCH_SIZE) {
        const batch = docs.slice(offset, offset + INSERT_BATCH_SIZE)
        if (batch.length > 0) {
          await collection.insertMany(batch, { ordered: false })
        }
      }

      documentCount += docs.length
      logger.info('Backup collection restored', { name: entry.name, count: docs.length })
    }

    await runMigrations()

    const durationMs = Date.now() - startedAt
    const result: RestoreResult = {
      folderPath,
      databaseName: manifest.databaseName,
      collectionCount: manifest.collections.length,
      documentCount,
      durationMs
    }

    const history: RestoreHistoryEntry = {
      at: new Date().toISOString(),
      durationMs,
      folderPath,
      databaseName: result.databaseName,
      collectionCount: result.collectionCount,
      documentCount: result.documentCount
    }
    this.prefs.saveLastRestore(history)

    return result
  }

  private async readManifest(folderPath: string): Promise<BackupManifest> {
    let raw: string
    try {
      raw = await readFile(join(folderPath, MANIFEST_FILE), 'utf8')
    } catch {
      throw new Error('Selected folder is not a valid ShopFlow backup (manifest.json missing).')
    }

    const manifest = JSON.parse(raw) as BackupManifest
    if (manifest.backupFormatVersion !== BACKUP_FORMAT_VERSION) {
      throw new Error('Unsupported backup format version.')
    }
    if (!Array.isArray(manifest.collections) || manifest.collections.length === 0) {
      throw new Error('Backup manifest has no collections.')
    }

    return manifest
  }

  private async pickDirectory(title: string, defaultPath?: string): Promise<string | null> {
    const window = this.getMainWindow() ?? undefined
    const options = {
      title,
      defaultPath,
      properties: ['openDirectory', 'createDirectory'] as ('openDirectory' | 'createDirectory')[]
    }

    const result = window
      ? await dialog.showOpenDialog(window, options)
      : await dialog.showOpenDialog(options)

    if (result.canceled || !result.filePaths[0]) {
      return null
    }

    return result.filePaths[0]
  }

  private async confirmRestore(databaseName: string): Promise<boolean> {
    const currentName = getDatabaseName()
    const window = this.getMainWindow() ?? undefined
    const message =
      `This will replace ALL data in the current database${
        currentName ? ` "${currentName}"` : ''
      } with the backup from "${databaseName}".\n\nThis action cannot be undone. Continue?`

    const result = window
      ? await dialog.showMessageBox(window, {
          type: 'warning',
          buttons: ['Cancel', 'Restore backup'],
          defaultId: 0,
          cancelId: 0,
          title: 'Confirm restore',
          message: 'Restore MongoDB backup?',
          detail: message
        })
      : await dialog.showMessageBox({
          type: 'warning',
          buttons: ['Cancel', 'Restore backup'],
          defaultId: 0,
          cancelId: 0,
          title: 'Confirm restore',
          message: 'Restore MongoDB backup?',
          detail: message
        })

    return result.response === 1
  }
}
