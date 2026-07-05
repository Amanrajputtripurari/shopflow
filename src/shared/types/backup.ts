export const BACKUP_FORMAT_VERSION = 1

export interface BackupManifestCollection {
  name: string
  count: number
}

export interface BackupManifest {
  backupFormatVersion: number
  schemaVersion: number
  appVersion: string
  databaseName: string
  createdAt: string
  collections: BackupManifestCollection[]
}

export interface BackupHistoryEntry {
  at: string
  durationMs: number
  folderPath: string
  databaseName: string
  collectionCount: number
  documentCount: number
}

export interface RestoreHistoryEntry {
  at: string
  durationMs: number
  folderPath: string
  databaseName: string
  collectionCount: number
  documentCount: number
}

export interface BackupSettings {
  backupFolderPath: string | null
  lastBackup: BackupHistoryEntry | null
  lastRestore: RestoreHistoryEntry | null
}

export interface BackupResult {
  folderPath: string
  databaseName: string
  collectionCount: number
  documentCount: number
  createdAt: string
  durationMs: number
}

export interface RestoreResult {
  folderPath: string
  databaseName: string
  collectionCount: number
  documentCount: number
  durationMs: number
}

export interface DatabaseAdminSetupInput {
  username: string
  password: string
  displayName: string
}

export interface ChangeConnectionInput {
  mongodbUrl: string
  companyName: string
  admin: DatabaseAdminSetupInput
}
