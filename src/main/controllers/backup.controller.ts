import { ipcMain } from 'electron'

import { IPC_CHANNELS } from '@shared/ipc-channels'
import type { ChangeConnectionInput } from '@shared/types/backup'
import { adminHandler, success } from '../helpers/secure-ipc'
import { BackupService } from '../services/backup.service'
import { changeConnectionUrl } from '../services/database-bootstrap.service'
import type { CryptoStore } from '../helpers/crypto-store'

export function registerBackupController(
  backupService: BackupService,
  cryptoStore: CryptoStore
): void {
  ipcMain.handle(
    IPC_CHANNELS.DB_GET_BACKUP_SETTINGS,
    adminHandler(IPC_CHANNELS.DB_GET_BACKUP_SETTINGS, async () => {
      return success(backupService.getBackupSettings())
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.DB_PICK_BACKUP_FOLDER,
    adminHandler(IPC_CHANNELS.DB_PICK_BACKUP_FOLDER, async () => {
      const folderPath = await backupService.pickBackupFolder()
      return success(backupService.getBackupSettings())
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.DB_CLEAR_BACKUP_FOLDER,
    adminHandler(IPC_CHANNELS.DB_CLEAR_BACKUP_FOLDER, async () => {
      await backupService.clearBackupFolder()
      return success(backupService.getBackupSettings())
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.DB_OPEN_BACKUP_FOLDER,
    adminHandler(IPC_CHANNELS.DB_OPEN_BACKUP_FOLDER, async () => {
      await backupService.openBackupFolder()
      return success(null)
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.DB_BACKUP,
    adminHandler(IPC_CHANNELS.DB_BACKUP, async () => {
      return success(await backupService.backup())
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.DB_RESTORE,
    adminHandler(IPC_CHANNELS.DB_RESTORE, async () => {
      return success(await backupService.restore())
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.DB_CHANGE_CONNECTION_URL,
    adminHandler(IPC_CHANNELS.DB_CHANGE_CONNECTION_URL, async (_user, input: ChangeConnectionInput) => {
      return success(await changeConnectionUrl(cryptoStore, input))
    })
  )
}
