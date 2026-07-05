export type WhatsAppSessionState = 'disconnected' | 'connecting' | 'qr' | 'ready' | 'error'

export interface WhatsAppSessionStatus {
  state: WhatsAppSessionState
  phone: string | null
  qrDataUrl: string | null
  lastError: string | null
  connectedAt: string | null
  /** 1–3 while startup auto-reconnect is running */
  reconnectAttempt?: number | null
  /** True when startup auto-reconnect exhausted all attempts */
  autoReconnectFailed?: boolean
  /** Whether local Baileys auth files exist */
  hasSavedSession?: boolean
}

export type ConversationStatus = 'open' | 'assigned' | 'waiting_customer' | 'closed'

export interface Conversation {
  id: string
  phone: string
  customerId: string | null
  customerName: string | null
  status: ConversationStatus
  assignedTo: string | null
  assignedToName: string | null
  lockedBy: string | null
  lockedByName: string | null
  unreadCount: number
  lastMessageAt: string
  lastMessagePreview: string
  lastInboundAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ChatMessage {
  id: string
  conversationId: string
  direction: 'inbound' | 'outbound'
  body: string
  mediaType: 'text' | 'document' | 'image' | null
  mediaPath: string | null
  waMessageId: string | null
  sentBy: string | null
  sentByName: string | null
  createdAt: string
}

export type MenuActionType = 'send_text' | 'send_pdf' | 'open_staff_queue' | 'trigger_flow'

export interface MenuItem {
  key: string
  label: string
  action: MenuActionType
  textTemplate?: string
  enabled: boolean
}

export interface MenuConfig {
  enabled: boolean
  welcomeTemplate: string
  items: MenuItem[]
  keywords: Record<string, string>
}

export interface MenuConfigInput {
  enabled?: boolean
  welcomeTemplate?: string
  items?: MenuItem[]
  keywords?: Record<string, string>
}

export type SystemTemplateKey =
  | 'order_confirm'
  | 'delivery_update'
  | 'credit_reminder'
  | 'order_with_invoice'

export interface SystemTemplates {
  order_confirm: string
  delivery_update: string
  credit_reminder: string
  order_with_invoice: string
}

export interface WhatsAppMessagingConfig {
  showTypingIndicator: boolean
  typingDurationMs: number
  skipQuotedReplies: boolean
  skipBusinessAccounts: boolean
  menuUseRegex: boolean
  autoSendOrderOnCreate: boolean
  autoSendOrderConfirmOnStatus: boolean
  autoSendDeliveryUpdate: boolean
  autoSendInvoiceOnBillGenerate: boolean
  templates: SystemTemplates
}

export interface WhatsAppMessagingConfigInput {
  showTypingIndicator?: boolean
  typingDurationMs?: number
  skipQuotedReplies?: boolean
  skipBusinessAccounts?: boolean
  menuUseRegex?: boolean
  autoSendOrderOnCreate?: boolean
  autoSendOrderConfirmOnStatus?: boolean
  autoSendDeliveryUpdate?: boolean
  autoSendInvoiceOnBillGenerate?: boolean
  templates?: Partial<SystemTemplates>
}

export type QueueMessageType = 'template' | 'bill' | 'reminder' | 'manual'
export type QueueMessageStatus = 'pending' | 'approved' | 'processing' | 'sent' | 'failed' | 'cancelled'

export interface QueueMessage {
  id: string
  type: QueueMessageType
  phone: string
  customerId: string | null
  customerName: string | null
  orderId: string | null
  body: string
  filePath: string | null
  requiresApproval: boolean
  status: QueueMessageStatus
  scheduledAt: string
  sentAt: string | null
  error: string | null
  createdBy: string
  createdByName: string
  createdAt: string
}

export interface QueueDeliveryStatusCounts {
  queued: number
  sending: number
  failed: number
  sent: number
}

export interface QueueDeliveryListInput {
  limit?: number
  offset?: number
}

export interface QueueDeliveryListResult {
  items: QueueMessage[]
  total: number
  hasMore: boolean
  statusCounts: QueueDeliveryStatusCounts
}

export interface AntiBanConfig {
  maxPerMinute: number
  maxPerHour: number
  minGapSameCustomerMs: number
  pauseOnFailureRate: number
  outboundPaused: boolean
}

export interface AntiBanConfigInput {
  maxPerMinute?: number
  maxPerHour?: number
  minGapSameCustomerMs?: number
  pauseOnFailureRate?: number
  outboundPaused?: boolean
}

export interface SendBillInput {
  orderId: string
  phone?: string
  billType?: 'simple' | 'gst'
}

export interface SendTemplateInput {
  phone: string
  templateKey: SystemTemplateKey | 'custom'
  body?: string
  variables?: Record<string, string>
  orderId?: string
}

export interface ReplyInput {
  conversationId: string
  body: string
}

export interface AssignConversationInput {
  conversationId: string
  userId?: string | null
}

export interface ApproveQueueInput {
  queueId: string
}

export interface WhatsAppLogEntry {
  id: string
  phone: string
  direction: 'outbound' | 'inbound'
  messageType: string
  bodyPreview: string
  success: boolean
  error: string | null
  createdAt: string
}

export interface ConversationDocument {
  _id: import('mongodb').ObjectId
  phone: string
  customerId: import('mongodb').ObjectId | null
  customerName: string | null
  status: ConversationStatus
  assignedTo: import('mongodb').ObjectId | null
  assignedToName: string | null
  lockedBy: import('mongodb').ObjectId | null
  lockedByName: string | null
  unreadCount: number
  lastMessageAt: Date
  lastMessagePreview: string
  lastInboundAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface MessageDocument {
  _id: import('mongodb').ObjectId
  conversationId: import('mongodb').ObjectId
  direction: 'inbound' | 'outbound'
  body: string
  mediaType: 'text' | 'document' | 'image' | null
  mediaPath: string | null
  waMessageId: string | null
  sentBy: import('mongodb').ObjectId | null
  sentByName: string | null
  createdAt: Date
}

export interface MenuConfigDocument {
  _id: 'singleton'
  enabled: boolean
  welcomeTemplate: string
  items: MenuItem[]
  keywords: Record<string, string>
  updatedAt: Date
}

export interface AntiBanConfigDocument {
  _id: 'singleton'
  maxPerMinute: number
  maxPerHour: number
  minGapSameCustomerMs: number
  pauseOnFailureRate: number
  outboundPaused: boolean
  updatedAt: Date
}

export interface WhatsAppMessagingConfigDocument {
  _id: 'singleton'
  showTypingIndicator: boolean
  typingDurationMs: number
  skipQuotedReplies: boolean
  skipBusinessAccounts: boolean
  menuUseRegex: boolean
  autoSendOrderOnCreate: boolean
  autoSendOrderConfirmOnStatus: boolean
  autoSendDeliveryUpdate: boolean
  autoSendInvoiceOnBillGenerate: boolean
  templates: SystemTemplates
  updatedAt: Date
}

export interface MessageQueueDocument {
  _id: import('mongodb').ObjectId
  type: QueueMessageType
  phone: string
  customerId: import('mongodb').ObjectId | null
  customerName: string | null
  orderId: import('mongodb').ObjectId | null
  body: string
  filePath: string | null
  requiresApproval: boolean
  status: QueueMessageStatus
  scheduledAt: Date
  sentAt: Date | null
  error: string | null
  createdBy: import('mongodb').ObjectId
  createdByName: string
  createdAt: Date
}

export interface WhatsAppLogDocument {
  _id: import('mongodb').ObjectId
  phone: string
  direction: 'outbound' | 'inbound'
  messageType: string
  bodyPreview: string
  success: boolean
  error: string | null
  createdAt: Date
}
