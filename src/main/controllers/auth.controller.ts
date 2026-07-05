import { ipcMain } from 'electron'

import { IPC_CHANNELS } from '@shared/ipc-channels'
import type { CreateUserInput, LoginInput } from '@shared/types/auth'
import { adminHandler, secureHandler, success } from '../helpers/secure-ipc'
import { ipcWrapper, success as publicSuccess } from '../helpers/ipc-wrapper'
import { authService } from '../services/auth.service'

export function registerAuthController(): void {
  ipcMain.handle(
    IPC_CHANNELS.AUTH_LOGIN,
    ipcWrapper(IPC_CHANNELS.AUTH_LOGIN, async (_event, input: LoginInput) => {
      const session = await authService.login(input)
      return publicSuccess(session)
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.AUTH_LOGOUT,
    ipcWrapper(IPC_CHANNELS.AUTH_LOGOUT, async (_event, token: unknown) => {
      authService.logout(typeof token === 'string' ? token : null)
      return publicSuccess(null)
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.AUTH_ME,
    ipcWrapper(IPC_CHANNELS.AUTH_ME, async (_event, token: unknown) => {
      const user = authService.me(typeof token === 'string' ? token : null)
      return publicSuccess(user)
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.USERS_LIST,
    adminHandler(IPC_CHANNELS.USERS_LIST, async () => {
      return success(await authService.listUsers())
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.USERS_CREATE,
    adminHandler(IPC_CHANNELS.USERS_CREATE, async (_user, input: CreateUserInput) => {
      return success(await authService.createUser(input))
    })
  )
}
