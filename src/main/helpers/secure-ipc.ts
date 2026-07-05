import type { AuthUser } from '@shared/types/auth'
import { failure, ipcWrapper, success } from './ipc-wrapper'
import { requireAdmin, requireSessionUser } from './session-store'

type Handler<TArgs extends unknown[], TResult> = (
  user: AuthUser,
  ...args: TArgs
) => Promise<TResult> | TResult

export function secureHandler<TArgs extends unknown[], TResult>(
  channel: string,
  handler: Handler<TArgs, TResult>
) {
  return ipcWrapper(channel, async (_event, token: unknown, ...args: TArgs) => {
    const user = requireSessionUser(typeof token === 'string' ? token : null)
    const result = await handler(user, ...args)
    return result
  })
}

export function adminHandler<TArgs extends unknown[], TResult>(
  channel: string,
  handler: Handler<TArgs, TResult>
) {
  return ipcWrapper(channel, async (_event, token: unknown, ...args: TArgs) => {
    const user = requireAdmin(typeof token === 'string' ? token : null)
    const result = await handler(user, ...args)
    return result
  })
}

export { success, failure }
