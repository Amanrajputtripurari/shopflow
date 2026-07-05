import { ipcMain } from 'electron'

import { IPC_CHANNELS } from '@shared/ipc-channels'
import type { ReportPeriodInput } from '@shared/types/report'
import { secureHandler, success } from '../helpers/secure-ipc'
import { reportsService } from '../services/reports.service'

export function registerReportsController(): void {
  ipcMain.handle(
    IPC_CHANNELS.REPORTS_SUMMARY,
    secureHandler(IPC_CHANNELS.REPORTS_SUMMARY, async (_user, input: ReportPeriodInput) => {
      return success(await reportsService.getSummary(input))
    })
  )
}
