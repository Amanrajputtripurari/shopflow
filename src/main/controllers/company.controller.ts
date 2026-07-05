import { ipcMain } from 'electron'

import { IPC_CHANNELS } from '@shared/ipc-channels'
import type { CompanyInput } from '@shared/types/company'
import { adminHandler, secureHandler, success } from '../helpers/secure-ipc'
import { companyService } from '../services/company.service'

export function registerCompanyController(): void {
  ipcMain.handle(
    IPC_CHANNELS.COMPANY_GET,
    secureHandler(IPC_CHANNELS.COMPANY_GET, async () => {
      return success(await companyService.getProfile())
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.COMPANY_SAVE,
    adminHandler(IPC_CHANNELS.COMPANY_SAVE, async (_user, input: CompanyInput) => {
      return success(await companyService.saveProfile(input))
    })
  )
}
