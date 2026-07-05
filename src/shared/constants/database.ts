export const APP_META_ID = 'singleton' as const
export const APP_SETTINGS_ID = 'singleton' as const
export const COMPANY_ID = 'singleton' as const
export const SCHEMA_VERSION = 7

export const CONFIG_SINGLETON_ID = 'singleton' as const

export const COLLECTIONS = {
  APP_META: 'app_meta',
  APP_SETTINGS: 'app_settings',
  USERS: 'users',
  COMPANY: 'company',
  PRODUCTS: 'products',
  CUSTOMERS: 'customers',
  ORDERS: 'orders',
  CUSTOMER_LEDGER: 'customer_ledger',
  EXPENSES: 'expenses',
  EXPENSE_CATEGORIES: 'expense_categories',
  WHATSAPP_SESSIONS: 'whatsapp_sessions',
  WHATSAPP_LOGS: 'whatsapp_logs',
  CONVERSATIONS: 'conversations',
  MESSAGES: 'messages',
  MENU_CONFIG: 'menu_config',
  ANTI_BAN_CONFIG: 'anti_ban_config',
  MESSAGE_QUEUE: 'message_queue',
  WHATSAPP_MESSAGING_CONFIG: 'whatsapp_messaging_config',
  INVOICE_LAYOUTS: 'invoice_layouts'
} as const

export const DEFAULT_EXPENSE_CATEGORIES = [
  'Rent',
  'Utilities',
  'Salaries',
  'Supplies',
  'Transport',
  'Miscellaneous'
] as const

export const DEFAULT_ADMIN = {
  username: 'admin',
  password: 'admin',
  displayName: 'Administrator'
} as const

export const DEFAULT_ANTI_BAN = {
  maxPerMinute: 4,
  maxPerHour: 40,
  minGapSameCustomerMs: 120_000,
  pauseOnFailureRate: 0.3,
  outboundPaused: false
} as const

export const DEFAULT_WHATSAPP_MENU = {
  enabled: true,
  welcomeTemplate: 'Welcome to {shopName}\nReply with a number:\n{menuItems}\nOr type menu anytime.',
  items: [
    { key: '1', label: 'Price list', action: 'send_text' as const, textTemplate: 'Please visit our shop or call us for the latest price list.', enabled: true },
    { key: '2', label: 'Place order', action: 'open_staff_queue' as const, enabled: true },
    { key: '3', label: 'My balance', action: 'trigger_flow' as const, textTemplate: 'Your outstanding balance is {creditBalance}.', enabled: true },
    { key: '4', label: 'Last bill', action: 'send_pdf' as const, enabled: true },
    { key: '5', label: 'Talk to staff', action: 'open_staff_queue' as const, enabled: true }
  ],
  keywords: {
    '^menu$': 'menu',
    '^(bill|invoice|4)$': '4',
    '^(order|buy|2)$': '2',
    '^(balance|credit|3)$': '3'
  }
} as const

export const DEFAULT_WHATSAPP_TEMPLATES = {
  order_confirm:
    'Hi {customerName}, your order {orderNo} is confirmed for {amount}. Thank you for shopping with {shopName}.',
  delivery_update:
    'Hi {customerName}, your delivery order {orderNo} is now {status}. Total: {amount}. — {shopName}',
  credit_reminder:
    'Hi {customerName}, your outstanding balance with {shopName} is {creditBalance}. Please contact us to settle.',
  order_with_invoice:
    'Hi {customerName}, your order {orderNo} is ready. Invoice {invoiceNo} for {amount} is attached. — {shopName}'
} as const

export const DEFAULT_WHATSAPP_MESSAGING = {
  showTypingIndicator: true,
  typingDurationMs: 1500,
  skipQuotedReplies: true,
  skipBusinessAccounts: true,
  menuUseRegex: true,
  autoSendOrderOnCreate: false,
  autoSendOrderConfirmOnStatus: true,
  autoSendDeliveryUpdate: true,
  autoSendInvoiceOnBillGenerate: false,
  templates: { ...DEFAULT_WHATSAPP_TEMPLATES }
} as const
