import type { BackupResult, BackupSettings, ChangeConnectionInput, RestoreResult } from '@shared/types/backup'
import type { DbStatus, IpcResult } from '@shared/types/settings'
import type { AuthSession, AuthUser, CreateUserInput, LoginInput, UserListItem } from '@shared/types/auth'
import type { CompanyInput, CompanyProfile } from '@shared/types/company'
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
import type { InvoiceLayout, InvoiceLayoutInput } from '@shared/types/invoice-layout'
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
  QueueDeliveryListInput,
  QueueDeliveryListResult,
  QueueMessage,
  ReplyInput,
  SendBillInput,
  SendTemplateInput,
  WhatsAppLogEntry,
  WhatsAppMessagingConfig,
  WhatsAppMessagingConfigInput,
  WhatsAppSessionStatus
} from '@shared/types/whatsapp'

export interface DatabaseApi {
  testConnection: (url: string) => Promise<IpcResult<{ databaseName: string; latencyMs: number }>>
  getStatus: () => Promise<IpcResult<DbStatus>>
  getBackupSettings: () => Promise<IpcResult<BackupSettings>>
  pickBackupFolder: () => Promise<IpcResult<BackupSettings>>
  clearBackupFolder: () => Promise<IpcResult<BackupSettings>>
  openBackupFolder: () => Promise<IpcResult<null>>
  backup: () => Promise<IpcResult<BackupResult>>
  restore: () => Promise<IpcResult<RestoreResult>>
  changeConnectionUrl: (input: ChangeConnectionInput) => Promise<IpcResult<DbStatus>>
  onStatusChanged: (callback: (status: DbStatus) => void) => () => void
}

export interface SettingsApi {
  get: () => Promise<IpcResult<import('@shared/types/settings').AppSettings>>
  save: (
    input: import('@shared/types/settings').AppSettingsInput
  ) => Promise<IpcResult<import('@shared/types/settings').AppSettings>>
  onUpdated: (callback: () => void) => () => void
}

export interface SetupApi {
  complete: (
    input: import('@shared/types/settings').SetupInput
  ) => Promise<IpcResult<import('@shared/types/settings').AppSettings>>
}

export interface AuthApi {
  login: (input: LoginInput) => Promise<IpcResult<AuthSession>>
  logout: () => Promise<IpcResult<null>>
  restoreSession: (token: string) => Promise<IpcResult<AuthUser>>
  getToken: () => string | null
}

export interface UsersApi {
  list: () => Promise<IpcResult<UserListItem[]>>
  create: (input: CreateUserInput) => Promise<IpcResult<UserListItem>>
}

export interface CompanyApi {
  get: () => Promise<IpcResult<CompanyProfile>>
  save: (input: CompanyInput) => Promise<IpcResult<CompanyProfile>>
}

export interface BillingApi {
  generate: (input: GenerateBillInput) => Promise<IpcResult<GenerateBillResult>>
  open: (filePath: string) => Promise<IpcResult<null>>
  download: (filePath: string, suggestedName?: string) => Promise<IpcResult<string | null>>
}

export interface InvoiceLayoutsApi {
  list: () => Promise<IpcResult<InvoiceLayout[]>>
  get: (id: string) => Promise<IpcResult<InvoiceLayout>>
  create: (input: InvoiceLayoutInput) => Promise<IpcResult<InvoiceLayout>>
  update: (id: string, input: InvoiceLayoutInput) => Promise<IpcResult<InvoiceLayout>>
  delete: (id: string) => Promise<IpcResult<null>>
  duplicate: (id: string, name: string) => Promise<IpcResult<InvoiceLayout>>
}

export interface LedgerApi {
  list: (customerId: string) => Promise<IpcResult<LedgerEntry[]>>
  recordPayment: (input: RecordPaymentInput) => Promise<IpcResult<null>>
  settle: (input: SettleCreditInput) => Promise<IpcResult<LedgerEntry>>
}

export interface StockApi {
  adjust: (input: StockAdjustInput) => Promise<IpcResult<null>>
}

export interface ProductsApi {
  list: (filters?: ProductListFilters) => Promise<IpcResult<PaginatedResult<Product>>>
  get: (id: string) => Promise<IpcResult<Product>>
  create: (input: ProductInput) => Promise<IpcResult<Product>>
  update: (id: string, input: ProductInput) => Promise<IpcResult<Product>>
  delete: (id: string) => Promise<IpcResult<null>>
}

export interface CustomersApi {
  list: (filters?: CustomerListFilters) => Promise<IpcResult<PaginatedResult<Customer>>>
  search: (query?: CustomerSearchQuery) => Promise<IpcResult<CustomerSearchResult>>
  get: (id: string) => Promise<IpcResult<Customer>>
  create: (input: CustomerInput) => Promise<IpcResult<Customer>>
  update: (id: string, input: CustomerInput) => Promise<IpcResult<Customer>>
  delete: (id: string) => Promise<IpcResult<null>>
}

export interface OrdersApi {
  list: (filters?: OrderListFilters) => Promise<IpcResult<OrderListResult>>
  listStats: (filters?: OrderListFilters) => Promise<IpcResult<OrderListStats>>
  get: (id: string) => Promise<IpcResult<Order>>
  create: (input: OrderInput) => Promise<IpcResult<Order>>
  update: (id: string, input: OrderInput) => Promise<IpcResult<Order>>
  updateStatus: (id: string, status: OrderStatus) => Promise<IpcResult<Order>>
}

export interface DashboardApi {
  stats: () => Promise<IpcResult<DashboardStats>>
}

export interface ExpenseCategoriesApi {
  list: () => Promise<IpcResult<ExpenseCategory[]>>
  create: (input: ExpenseCategoryInput) => Promise<IpcResult<ExpenseCategory>>
  update: (id: string, input: ExpenseCategoryInput) => Promise<IpcResult<ExpenseCategory>>
  delete: (id: string) => Promise<IpcResult<null>>
}

export interface ExpensesApi {
  list: (filters?: ExpenseListFilters) => Promise<IpcResult<ExpenseListResult>>
  create: (input: ExpenseInput) => Promise<IpcResult<Expense>>
  update: (id: string, input: ExpenseInput) => Promise<IpcResult<Expense>>
  delete: (id: string) => Promise<IpcResult<null>>
}

export interface ReportsApi {
  summary: (input: ReportPeriodInput) => Promise<IpcResult<SummaryReport>>
}

export interface WhatsAppApi {
  sessionStatus: () => Promise<IpcResult<WhatsAppSessionStatus>>
  connect: () => Promise<IpcResult<WhatsAppSessionStatus>>
  disconnect: () => Promise<IpcResult<WhatsAppSessionStatus>>
  onSessionChanged: (callback: (status: WhatsAppSessionStatus) => void) => () => void
  onInboxUpdated: (callback: () => void) => () => void
  getMenu: () => Promise<IpcResult<MenuConfig>>
  saveMenu: (input: MenuConfigInput) => Promise<IpcResult<MenuConfig>>
  getAntiBan: () => Promise<IpcResult<AntiBanConfig>>
  saveAntiBan: (input: AntiBanConfigInput) => Promise<IpcResult<AntiBanConfig>>
  getMessaging: () => Promise<IpcResult<WhatsAppMessagingConfig>>
  saveMessaging: (input: WhatsAppMessagingConfigInput) => Promise<IpcResult<WhatsAppMessagingConfig>>
  inboxList: () => Promise<IpcResult<Conversation[]>>
  messagesList: (conversationId: string) => Promise<IpcResult<ChatMessage[]>>
  assign: (input: AssignConversationInput) => Promise<IpcResult<Conversation>>
  reply: (input: ReplyInput) => Promise<IpcResult<null>>
  sendBill: (input: SendBillInput) => Promise<IpcResult<QueueMessage>>
  sendTemplate: (input: SendTemplateInput) => Promise<IpcResult<QueueMessage>>
  queueList: () => Promise<IpcResult<QueueMessage[]>>
  queueDeliveryList: (input?: QueueDeliveryListInput) => Promise<IpcResult<QueueDeliveryListResult>>
  queueApprove: (input: ApproveQueueInput) => Promise<IpcResult<QueueMessage>>
  queueRetry: (queueId: string) => Promise<IpcResult<QueueMessage>>
  logsList: () => Promise<IpcResult<WhatsAppLogEntry[]>>
}

export interface AppApi {
  getVersion: () => Promise<IpcResult<string>>
  openLogs: () => Promise<IpcResult<null>>
}

export interface ShopFlowApi {
  database: DatabaseApi
  settings: SettingsApi
  setup: SetupApi
  auth: AuthApi
  users: UsersApi
  company: CompanyApi
  products: ProductsApi
  customers: CustomersApi
  orders: OrdersApi
  billing: BillingApi
  invoiceLayouts: InvoiceLayoutsApi
  ledger: LedgerApi
  stock: StockApi
  expenseCategories: ExpenseCategoriesApi
  expenses: ExpensesApi
  reports: ReportsApi
  whatsapp: WhatsAppApi
  dashboard: DashboardApi
  app: AppApi
}

declare global {
  interface Window {
    api: ShopFlowApi
  }
}

export {}
