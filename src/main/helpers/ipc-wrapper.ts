import type { IpcMainInvokeEvent } from 'electron'

import { failure, success } from './error-handler'
import { logger } from './logger'

type IpcHandler<TArgs extends unknown[], TResult> = (
  event: IpcMainInvokeEvent,
  ...args: TArgs
) => Promise<TResult> | TResult

export function ipcWrapper<TArgs extends unknown[], TResult>(
  channel: string,
  handler: IpcHandler<TArgs, TResult>
): IpcHandler<TArgs, TResult | { ok: false; error: string }> {
  return async (event, ...args) => {
    try {
      const result = await handler(event, ...args)
      return result
    } catch (error) {
      logger.error(`IPC ${channel} failed`, error)
      return failure(error)
    }
  }
}

export { failure, success }
