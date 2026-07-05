import { contextBridge, ipcRenderer } from 'electron'

import { IPC_CHANNELS, IPC_EVENTS } from '@shared/ipc-channels'
import type { ShopFlowApi } from '@shared/types/api'
import type { BackupResult, BackupSettings, ChangeConnectionInput, RestoreResult } from '@shared/types/backup'
import type { AppSettingsInput, DbStatus, IpcResult, SetupInput } from '@shared/types/settings'
import type { CompanyInput, CompanyProfile } from '@shared/types/company'
import type { CreateUserInput, LoginInput, UserListItem } from '@shared/types/auth'
import type { Customer, CustomerInput, CustomerListFilters, CustomerSearchQuery, CustomerSearchResult } from '@shared/types/customer'
import type {
  Expense,
  ExpenseCategory,
  ExpenseCategoryInput,
  ExpenseInput,
  ExpenseListFilters,
  ExpenseListResult
} from '@shared/types/expense'
import type { LedgerEntry, RecordPaymentInput, SettleCreditInput } from '@shared/types/ledger'
import type {
  DashboardStats,
  GenerateBillInput,
  GenerateBillResult,
  Order,
  OrderInput,
  OrderListFilters,
  OrderListResult,
  OrderListStats,
  OrderStatus
} from '@shared/types/order'
import type { InvoiceLayout, InvoiceLayoutInput } from '@shared/types/invoice-layout'
import type { PaginatedResult } from '@shared/types/pagination'
import type { Product, ProductInput, ProductListFilters, StockAdjustInput } from '@shared/types/product'
import type { ReportPeriodInput, SummaryReport } from '@shared/types/report'
import type {
  AntiBanConfig,
  AntiBanConfigInput,
  ApproveQueueInput,
  AssignConversationInput,
  ChatMessage,
  Conversation,
  MenuConfig,
  MenuConfigInput,
  QueueMessage,
  QueueDeliveryListInput,
  QueueDeliveryListResult,
  ReplyInput,
  SendBillInput,
  SendTemplateInput,
  WhatsAppLogEntry,
  WhatsAppMessagingConfig,
  WhatsAppMessagingConfigInput,
  WhatsAppSessionStatus
} from '@shared/types/whatsapp'

let authToken: string | null = null

function authInvoke<T>(channel: string, ...args: unknown[]): Promise<IpcResult<T>> {
  return ipcRenderer.invoke(channel, authToken, ...args) as Promise<IpcResult<T>>
}

const database = {
  testConnection: (url: string) => ipcRenderer.invoke(IPC_CHANNELS.DB_TEST_CONNECTION, url),
  getStatus: () => ipcRenderer.invoke(IPC_CHANNELS.DB_GET_STATUS),
  getBackupSettings: () => authInvoke<BackupSettings>(IPC_CHANNELS.DB_GET_BACKUP_SETTINGS),
  pickBackupFolder: () => authInvoke<BackupSettings>(IPC_CHANNELS.DB_PICK_BACKUP_FOLDER),
  clearBackupFolder: () => authInvoke<BackupSettings>(IPC_CHANNELS.DB_CLEAR_BACKUP_FOLDER),
  openBackupFolder: () => authInvoke<null>(IPC_CHANNELS.DB_OPEN_BACKUP_FOLDER),
  backup: () => authInvoke<BackupResult>(IPC_CHANNELS.DB_BACKUP),
  restore: () => authInvoke<RestoreResult>(IPC_CHANNELS.DB_RESTORE),
  changeConnectionUrl: (input: ChangeConnectionInput) =>
    authInvoke<DbStatus>(IPC_CHANNELS.DB_CHANGE_CONNECTION_URL, input),
  onStatusChanged: (callback: (status: DbStatus) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, status: DbStatus) => callback(status)
    ipcRenderer.on(IPC_EVENTS.DB_STATUS_CHANGED, listener)
    return () => ipcRenderer.removeListener(IPC_EVENTS.DB_STATUS_CHANGED, listener)
  }
}

const settings = {
  get: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),
  save: (input: AppSettingsInput) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SAVE, input),
  onUpdated: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on(IPC_EVENTS.SETTINGS_UPDATED, listener)
    return () => ipcRenderer.removeListener(IPC_EVENTS.SETTINGS_UPDATED, listener)
  }
}

const setup = {
  complete: (input: SetupInput) => ipcRenderer.invoke(IPC_CHANNELS.SETUP_COMPLETE, input)
}

const auth = {
  login: async (input: LoginInput) => {
    const result = await ipcRenderer.invoke(IPC_CHANNELS.AUTH_LOGIN, input)
    if (result.ok) {
      authToken = result.data.token
    }
    return result
  },
  logout: async () => {
    const result = await ipcRenderer.invoke(IPC_CHANNELS.AUTH_LOGOUT, authToken)
    authToken = null
    return result
  },
  restoreSession: async (token: string) => {
    const result = await ipcRenderer.invoke(IPC_CHANNELS.AUTH_ME, token)
    if (result.ok) {
      authToken = token
    } else {
      authToken = null
    }
    return result
  },
  getToken: () => authToken
}

const users = {
  list: () => authInvoke<UserListItem[]>(IPC_CHANNELS.USERS_LIST),
  create: (input: CreateUserInput) => authInvoke<UserListItem>(IPC_CHANNELS.USERS_CREATE, input)
}

const company = {
  get: () => authInvoke<CompanyProfile>(IPC_CHANNELS.COMPANY_GET),
  save: (input: CompanyInput) => authInvoke<CompanyProfile>(IPC_CHANNELS.COMPANY_SAVE, input)
}

const products = {
  list: (filters?: ProductListFilters) =>
    authInvoke<PaginatedResult<Product>>(IPC_CHANNELS.PRODUCTS_LIST, filters),
  get: (id: string) => authInvoke<Product>(IPC_CHANNELS.PRODUCTS_GET, id),
  create: (input: ProductInput) => authInvoke<Product>(IPC_CHANNELS.PRODUCTS_CREATE, input),
  update: (id: string, input: ProductInput) =>
    authInvoke<Product>(IPC_CHANNELS.PRODUCTS_UPDATE, id, input),
  delete: (id: string) => authInvoke<null>(IPC_CHANNELS.PRODUCTS_DELETE, id)
}

const customers = {
  list: (filters?: CustomerListFilters) =>
    authInvoke<PaginatedResult<Customer>>(IPC_CHANNELS.CUSTOMERS_LIST, filters),
  search: (query?: CustomerSearchQuery) =>
    authInvoke<CustomerSearchResult>(IPC_CHANNELS.CUSTOMERS_SEARCH, query),
  get: (id: string) => authInvoke<Customer>(IPC_CHANNELS.CUSTOMERS_GET, id),
  create: (input: CustomerInput) => authInvoke<Customer>(IPC_CHANNELS.CUSTOMERS_CREATE, input),
  update: (id: string, input: CustomerInput) =>
    authInvoke<Customer>(IPC_CHANNELS.CUSTOMERS_UPDATE, id, input),
  delete: (id: string) => authInvoke<null>(IPC_CHANNELS.CUSTOMERS_DELETE, id)
}

const orders = {
  list: (filters?: OrderListFilters) =>
    authInvoke<OrderListResult>(IPC_CHANNELS.ORDERS_LIST, filters),
  listStats: (filters?: OrderListFilters) =>
    authInvoke<OrderListStats>(IPC_CHANNELS.ORDERS_LIST_STATS, filters),
  get: (id: string) => authInvoke<Order>(IPC_CHANNELS.ORDERS_GET, id),
  create: (input: OrderInput) => authInvoke<Order>(IPC_CHANNELS.ORDERS_CREATE, input),
  update: (id: string, input: OrderInput) => authInvoke<Order>(IPC_CHANNELS.ORDERS_UPDATE, id, input),
  updateStatus: (id: string, status: OrderStatus) =>
    authInvoke<Order>(IPC_CHANNELS.ORDERS_UPDATE_STATUS, id, status)
}

const billing = {
  generate: (input: GenerateBillInput) =>
    authInvoke<GenerateBillResult>(IPC_CHANNELS.BILLING_GENERATE, input),
  open: (filePath: string) => authInvoke<null>(IPC_CHANNELS.BILLING_OPEN, filePath),
  download: (filePath: string, suggestedName?: string) =>
    authInvoke<string | null>(IPC_CHANNELS.BILLING_DOWNLOAD, filePath, suggestedName)
}

const invoiceLayouts = {
  list: () => authInvoke<InvoiceLayout[]>(IPC_CHANNELS.INVOICE_LAYOUTS_LIST),
  get: (id: string) => authInvoke<InvoiceLayout>(IPC_CHANNELS.INVOICE_LAYOUTS_GET, id),
  create: (input: InvoiceLayoutInput) =>
    authInvoke<InvoiceLayout>(IPC_CHANNELS.INVOICE_LAYOUTS_CREATE, input),
  update: (id: string, input: InvoiceLayoutInput) =>
    authInvoke<InvoiceLayout>(IPC_CHANNELS.INVOICE_LAYOUTS_UPDATE, id, input),
  delete: (id: string) => authInvoke<null>(IPC_CHANNELS.INVOICE_LAYOUTS_DELETE, id),
  duplicate: (id: string, name: string) =>
    authInvoke<InvoiceLayout>(IPC_CHANNELS.INVOICE_LAYOUTS_DUPLICATE, id, name)
}

const ledger = {
  list: (customerId: string) => authInvoke<LedgerEntry[]>(IPC_CHANNELS.LEDGER_LIST, customerId),
  recordPayment: (input: RecordPaymentInput) =>
    authInvoke<null>(IPC_CHANNELS.LEDGER_RECORD_PAYMENT, input),
  settle: (input: SettleCreditInput) => authInvoke<LedgerEntry>(IPC_CHANNELS.LEDGER_SETTLE, input)
}

const stock = {
  adjust: (input: StockAdjustInput) => authInvoke<null>(IPC_CHANNELS.STOCK_ADJUST, input)
}

const expenseCategories = {
  list: () => authInvoke<ExpenseCategory[]>(IPC_CHANNELS.EXPENSE_CATEGORIES_LIST),
  create: (input: ExpenseCategoryInput) =>
    authInvoke<ExpenseCategory>(IPC_CHANNELS.EXPENSE_CATEGORIES_CREATE, input),
  update: (id: string, input: ExpenseCategoryInput) =>
    authInvoke<ExpenseCategory>(IPC_CHANNELS.EXPENSE_CATEGORIES_UPDATE, id, input),
  delete: (id: string) => authInvoke<null>(IPC_CHANNELS.EXPENSE_CATEGORIES_DELETE, id)
}

const expenses = {
  list: (filters?: ExpenseListFilters) =>
    authInvoke<ExpenseListResult>(IPC_CHANNELS.EXPENSES_LIST, filters),
  create: (input: ExpenseInput) => authInvoke<Expense>(IPC_CHANNELS.EXPENSES_CREATE, input),
  update: (id: string, input: ExpenseInput) =>
    authInvoke<Expense>(IPC_CHANNELS.EXPENSES_UPDATE, id, input),
  delete: (id: string) => authInvoke<null>(IPC_CHANNELS.EXPENSES_DELETE, id)
}

const reports = {
  summary: (input: ReportPeriodInput) =>
    authInvoke<SummaryReport>(IPC_CHANNELS.REPORTS_SUMMARY, input)
}

const whatsapp = {
  sessionStatus: () => authInvoke<WhatsAppSessionStatus>(IPC_CHANNELS.WHATSAPP_SESSION_STATUS),
  connect: () => authInvoke<WhatsAppSessionStatus>(IPC_CHANNELS.WHATSAPP_CONNECT),
  disconnect: () => authInvoke<WhatsAppSessionStatus>(IPC_CHANNELS.WHATSAPP_DISCONNECT),
  onSessionChanged: (callback: (status: WhatsAppSessionStatus) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, status: WhatsAppSessionStatus) =>
      callback(status)
    ipcRenderer.on(IPC_EVENTS.WHATSAPP_SESSION_CHANGED, listener)
    return () => ipcRenderer.removeListener(IPC_EVENTS.WHATSAPP_SESSION_CHANGED, listener)
  },
  onInboxUpdated: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on(IPC_EVENTS.WHATSAPP_INBOX_UPDATED, listener)
    return () => ipcRenderer.removeListener(IPC_EVENTS.WHATSAPP_INBOX_UPDATED, listener)
  },
  getMenu: () => authInvoke<MenuConfig>(IPC_CHANNELS.WHATSAPP_MENU_GET),
  saveMenu: (input: MenuConfigInput) => authInvoke<MenuConfig>(IPC_CHANNELS.WHATSAPP_MENU_SAVE, input),
  getAntiBan: () => authInvoke<AntiBanConfig>(IPC_CHANNELS.WHATSAPP_ANTIBAN_GET),
  saveAntiBan: (input: AntiBanConfigInput) =>
    authInvoke<AntiBanConfig>(IPC_CHANNELS.WHATSAPP_ANTIBAN_SAVE, input),
  getMessaging: () => authInvoke<WhatsAppMessagingConfig>(IPC_CHANNELS.WHATSAPP_MESSAGING_GET),
  saveMessaging: (input: WhatsAppMessagingConfigInput) =>
    authInvoke<WhatsAppMessagingConfig>(IPC_CHANNELS.WHATSAPP_MESSAGING_SAVE, input),
  inboxList: () => authInvoke<Conversation[]>(IPC_CHANNELS.WHATSAPP_INBOX_LIST),
  messagesList: (conversationId: string) =>
    authInvoke<ChatMessage[]>(IPC_CHANNELS.WHATSAPP_MESSAGES_LIST, conversationId),
  assign: (input: AssignConversationInput) =>
    authInvoke<Conversation>(IPC_CHANNELS.WHATSAPP_ASSIGN, input),
  reply: (input: ReplyInput) => authInvoke<null>(IPC_CHANNELS.WHATSAPP_REPLY, input),
  sendBill: (input: SendBillInput) => authInvoke<QueueMessage>(IPC_CHANNELS.WHATSAPP_SEND_BILL, input),
  sendTemplate: (input: SendTemplateInput) =>
    authInvoke<QueueMessage>(IPC_CHANNELS.WHATSAPP_SEND_TEMPLATE, input),
  queueList: () => authInvoke<QueueMessage[]>(IPC_CHANNELS.WHATSAPP_QUEUE_LIST),
  queueDeliveryList: (input?: QueueDeliveryListInput) =>
    authInvoke<QueueDeliveryListResult>(IPC_CHANNELS.WHATSAPP_QUEUE_DELIVERY_LIST, input),
  queueApprove: (input: ApproveQueueInput) =>
    authInvoke<QueueMessage>(IPC_CHANNELS.WHATSAPP_QUEUE_APPROVE, input),
  queueRetry: (queueId: string) =>
    authInvoke<QueueMessage>(IPC_CHANNELS.WHATSAPP_QUEUE_RETRY, queueId),
  logsList: () => authInvoke<WhatsAppLogEntry[]>(IPC_CHANNELS.WHATSAPP_LOGS_LIST)
}

const dashboard = {
  stats: () => authInvoke<DashboardStats>(IPC_CHANNELS.DASHBOARD_STATS)
}

const app = {
  getVersion: () => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_VERSION),
  openLogs: () => ipcRenderer.invoke(IPC_CHANNELS.APP_OPEN_LOGS)
}

const api: ShopFlowApi = {
  database,
  settings,
  setup,
  auth,
  users,
  company,
  products,
  customers,
  orders,
  billing,
  invoiceLayouts,
  ledger,
  stock,
  expenseCategories,
  expenses,
  reports,
  whatsapp,
  dashboard,
  app
}

contextBridge.exposeInMainWorld('api', api)
