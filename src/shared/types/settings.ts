export type ThemeMode = 'light' | 'dark' | 'system'

export type ThemeColor = 'default' | 'blue' | 'green' | 'violet' | 'orange' | 'rose'

export interface AppSettings {
  setupComplete: boolean
  companyName: string
  theme: ThemeMode
  themeColor: ThemeColor
}

export interface AppSettingsInput {
  companyName?: string
  theme?: ThemeMode
  themeColor?: ThemeColor
}

export interface SetupInput {
  mongodbUrl: string
  companyName: string
  admin: import('./backup').DatabaseAdminSetupInput
}

export interface DbStatus {
  connected: boolean
  databaseName: string | null
  latencyMs: number | null
  error: string | null
  lastCheckedAt: string
}

export interface IpcSuccess<T> {
  ok: true
  data: T
}

export interface IpcFailure {
  ok: false
  error: string
}

export type IpcResult<T> = IpcSuccess<T> | IpcFailure

export interface AppMetaDocument {
  _id: typeof import('../constants/database').APP_META_ID
  schemaVersion: number
  createdAt: Date
  updatedAt: Date
}

export interface AppSettingsDocument {
  _id: typeof import('../constants/database').APP_SETTINGS_ID
  setupComplete: boolean
  companyName: string
  theme: ThemeMode
  themeColor?: ThemeColor
  updatedAt: Date
}
