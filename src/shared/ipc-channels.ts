export const IPC_CHANNELS = {
  DB_TEST_CONNECTION: 'db:test-connection',
  DB_GET_STATUS: 'db:get-status',
  DB_BACKUP: 'db:backup',
  DB_RESTORE: 'db:restore',
  DB_CHANGE_CONNECTION_URL: 'db:change-connection-url',
  DB_GET_BACKUP_SETTINGS: 'db:get-backup-settings',
  DB_PICK_BACKUP_FOLDER: 'db:pick-backup-folder',
  DB_CLEAR_BACKUP_FOLDER: 'db:clear-backup-folder',
  DB_OPEN_BACKUP_FOLDER: 'db:open-backup-folder',
  SETTINGS_GET: 'settings:get',
  SETTINGS_SAVE: 'settings:save',
  SETUP_COMPLETE: 'setup:complete',
  APP_GET_VERSION: 'app:get-version',
  APP_OPEN_LOGS: 'app:open-logs',

  AUTH_LOGIN: 'auth:login',
  AUTH_LOGOUT: 'auth:logout',
  AUTH_ME: 'auth:me',

  COMPANY_GET: 'company:get',
  COMPANY_SAVE: 'company:save',

  USERS_LIST: 'users:list',
  USERS_CREATE: 'users:create',

  PRODUCTS_LIST: 'products:list',
  PRODUCTS_GET: 'products:get',
  PRODUCTS_CREATE: 'products:create',
  PRODUCTS_UPDATE: 'products:update',
  PRODUCTS_DELETE: 'products:delete',

  CUSTOMERS_LIST: 'customers:list',
  CUSTOMERS_SEARCH: 'customers:search',
  CUSTOMERS_GET: 'customers:get',
  CUSTOMERS_CREATE: 'customers:create',
  CUSTOMERS_UPDATE: 'customers:update',
  CUSTOMERS_DELETE: 'customers:delete',

  ORDERS_LIST: 'orders:list',
  ORDERS_LIST_STATS: 'orders:list-stats',
  ORDERS_GET: 'orders:get',
  ORDERS_CREATE: 'orders:create',
  ORDERS_UPDATE: 'orders:update',
  ORDERS_UPDATE_STATUS: 'orders:update-status',

  BILLING_GENERATE: 'billing:generate',
  BILLING_OPEN: 'billing:open',
  BILLING_DOWNLOAD: 'billing:download',

  INVOICE_LAYOUTS_LIST: 'invoice-layouts:list',
  INVOICE_LAYOUTS_GET: 'invoice-layouts:get',
  INVOICE_LAYOUTS_CREATE: 'invoice-layouts:create',
  INVOICE_LAYOUTS_UPDATE: 'invoice-layouts:update',
  INVOICE_LAYOUTS_DELETE: 'invoice-layouts:delete',
  INVOICE_LAYOUTS_DUPLICATE: 'invoice-layouts:duplicate',

  LEDGER_LIST: 'ledger:list',
  LEDGER_RECORD_PAYMENT: 'ledger:record-payment',
  LEDGER_SETTLE: 'ledger:settle',

  STOCK_ADJUST: 'stock:adjust',

  EXPENSE_CATEGORIES_LIST: 'expense-categories:list',
  EXPENSE_CATEGORIES_CREATE: 'expense-categories:create',
  EXPENSE_CATEGORIES_UPDATE: 'expense-categories:update',
  EXPENSE_CATEGORIES_DELETE: 'expense-categories:delete',

  EXPENSES_LIST: 'expenses:list',
  EXPENSES_CREATE: 'expenses:create',
  EXPENSES_UPDATE: 'expenses:update',
  EXPENSES_DELETE: 'expenses:delete',

  REPORTS_SUMMARY: 'reports:summary',

  WHATSAPP_SESSION_STATUS: 'whatsapp:session-status',
  WHATSAPP_CONNECT: 'whatsapp:connect',
  WHATSAPP_DISCONNECT: 'whatsapp:disconnect',
  WHATSAPP_MENU_GET: 'whatsapp:menu-get',
  WHATSAPP_MENU_SAVE: 'whatsapp:menu-save',
  WHATSAPP_ANTIBAN_GET: 'whatsapp:antiban-get',
  WHATSAPP_ANTIBAN_SAVE: 'whatsapp:antiban-save',
  WHATSAPP_MESSAGING_GET: 'whatsapp:messaging-get',
  WHATSAPP_MESSAGING_SAVE: 'whatsapp:messaging-save',
  WHATSAPP_INBOX_LIST: 'whatsapp:inbox-list',
  WHATSAPP_MESSAGES_LIST: 'whatsapp:messages-list',
  WHATSAPP_ASSIGN: 'whatsapp:assign',
  WHATSAPP_REPLY: 'whatsapp:reply',
  WHATSAPP_SEND_BILL: 'whatsapp:send-bill',
  WHATSAPP_SEND_TEMPLATE: 'whatsapp:send-template',
  WHATSAPP_QUEUE_LIST: 'whatsapp:queue-list',
  WHATSAPP_QUEUE_DELIVERY_LIST: 'whatsapp:queue-delivery-list',
  WHATSAPP_QUEUE_APPROVE: 'whatsapp:queue-approve',
  WHATSAPP_QUEUE_RETRY: 'whatsapp:queue-retry',
  WHATSAPP_LOGS_LIST: 'whatsapp:logs-list',

  DASHBOARD_STATS: 'dashboard:stats'
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]

export const IPC_EVENTS = {
  DB_STATUS_CHANGED: 'db:status-changed',
  SETTINGS_UPDATED: 'settings:updated',
  WHATSAPP_SESSION_CHANGED: 'whatsapp:session-changed',
  WHATSAPP_QR_UPDATED: 'whatsapp:qr-updated',
  WHATSAPP_INBOX_UPDATED: 'whatsapp:inbox-updated'
} as const

export type IpcEvent = (typeof IPC_EVENTS)[keyof typeof IPC_EVENTS]
