import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import type { BackupHistoryEntry, RestoreHistoryEntry } from '@shared/types/backup'
import { logger } from './logger'

const PREFS_DIR = 'config'
const PREFS_FILE = 'local-preferences.json'

export interface LocalPreferences {
  backupFolderPath?: string | null
  lastBackup?: BackupHistoryEntry | null
  lastRestore?: RestoreHistoryEntry | null
}

function getPrefsPath(userDataPath: string): string {
  const dir = join(userDataPath, PREFS_DIR)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return join(dir, PREFS_FILE)
}

function readPrefs(userDataPath: string): LocalPreferences {
  const path = getPrefsPath(userDataPath)
  if (!existsSync(path)) {
    return {}
  }

  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as LocalPreferences
  } catch (error) {
    logger.error('Failed to read local preferences', error)
    return {}
  }
}

function writePrefs(userDataPath: string, prefs: LocalPreferences): void {
  writeFileSync(getPrefsPath(userDataPath), JSON.stringify(prefs, null, 2), 'utf-8')
}

export class LocalPreferencesStore {
  constructor(private readonly userDataPath: string) {}

  getBackupSettings(): {
    backupFolderPath: string | null
    lastBackup: BackupHistoryEntry | null
    lastRestore: RestoreHistoryEntry | null
  } {
    const prefs = readPrefs(this.userDataPath)
    return {
      backupFolderPath: prefs.backupFolderPath ?? null,
      lastBackup: prefs.lastBackup ?? null,
      lastRestore: prefs.lastRestore ?? null
    }
  }

  setBackupFolderPath(folderPath: string | null): void {
    const prefs = readPrefs(this.userDataPath)
    prefs.backupFolderPath = folderPath
    writePrefs(this.userDataPath, prefs)
  }

  saveLastBackup(entry: BackupHistoryEntry): void {
    const prefs = readPrefs(this.userDataPath)
    prefs.lastBackup = entry
    writePrefs(this.userDataPath, prefs)
  }

  saveLastRestore(entry: RestoreHistoryEntry): void {
    const prefs = readPrefs(this.userDataPath)
    prefs.lastRestore = entry
    writePrefs(this.userDataPath, prefs)
  }
}
