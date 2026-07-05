export const APP_EVENTS = {
  READY: 'app.ready',
  QUIT: 'app.quit',
  WINDOW_FOCUSED: 'app.windowFocused'
} as const

export const DB_EVENTS = {
  CONNECTED: 'db.connected',
  DISCONNECTED: 'db.disconnected',
  ERROR: 'db.error'
} as const

export const SETTINGS_EVENTS = {
  UPDATED: 'settings.updated'
} as const

export const WHATSAPP_EVENTS = {
  SESSION_CHANGED: 'whatsapp.sessionChanged',
  INBOX_UPDATED: 'whatsapp.inboxUpdated',
  QR_UPDATED: 'whatsapp.qrUpdated'
} as const

export type AppEvent = (typeof APP_EVENTS)[keyof typeof APP_EVENTS]
export type DbEvent = (typeof DB_EVENTS)[keyof typeof DB_EVENTS]
export type SettingsEvent = (typeof SETTINGS_EVENTS)[keyof typeof SETTINGS_EVENTS]
export type WhatsAppEvent = (typeof WHATSAPP_EVENTS)[keyof typeof WHATSAPP_EVENTS]

export type ShopFlowEvent = AppEvent | DbEvent | SettingsEvent | WhatsAppEvent
