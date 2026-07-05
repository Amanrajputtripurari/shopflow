import { basename } from 'node:path'
import { existsSync } from 'node:fs'
import { ObjectId } from 'mongodb'
import type { BrowserWindow } from 'electron'

import { WHATSAPP_EVENTS } from '@shared/events'
import { IPC_EVENTS } from '@shared/ipc-channels'
import type { AuthUser } from '@shared/types/auth'
import { canGenerateBillType, getOrderInvoices } from '@shared/types/order'
import type {
  AntiBanConfigInput,
  ApproveQueueInput,
  AssignConversationInput,
  MenuConfigInput,
  QueueDeliveryListInput,
  QueueDeliveryListResult,
  QueueMessage,
  ReplyInput,
  SendBillInput,
  SendTemplateInput,
  SystemTemplateKey,
  WhatsAppMessagingConfigInput,
  WhatsAppSessionStatus
} from '@shared/types/whatsapp'
import { eventBus } from '../events/event-bus'
import { logger } from '../helpers/logger'
import { antiBanConfigRepository } from '../repositories/anti-ban-config.repository'
import { companyRepository } from '../repositories/company.repository'
import { conversationsRepository, messagesRepository } from '../repositories/conversations.repository'
import { customersRepository } from '../repositories/customers.repository'
import { messageQueueRepository } from '../repositories/message-queue.repository'
import { menuConfigRepository } from '../repositories/menu-config.repository'
import { ordersRepository } from '../repositories/orders.repository'
import { whatsappLogsRepository } from '../repositories/whatsapp-logs.repository'
import { whatsappMessagingConfigRepository } from '../repositories/whatsapp-messaging-config.repository'
import { BaileysClient, type InboundHandler } from '../whatsapp/baileys-client'
import { runWhatsAppAutoReconnect } from '../whatsapp/auto-reconnect.runner'
import { matchMenuItemKey, matchMenuKeyword, matchesMenuInput } from '../whatsapp/menu-match'
import { isValidPhone, normalizePhone } from '../whatsapp/phone-utils'
import { RateLimiter } from '../whatsapp/rate-limiter'
import { buildMenuText, renderTemplate } from '../whatsapp/template-vars'
import { stockService } from './stock.service'

export class WhatsAppService {
  private client: BaileysClient
  private rateLimiter = new RateLimiter({
    maxPerMinute: 4,
    maxPerHour: 40,
    minGapSameCustomerMs: 120_000,
    pauseOnFailureRate: 0.3,
    outboundPaused: false
  })

  private getMainWindow: (() => BrowserWindow | null) | null = null
  private queueTimer: NodeJS.Timeout | null = null
  private initialized = false
  private autoReconnectRunning = false

  constructor() {
    this.client = new BaileysClient(async (payload) => {
      await this.handleInbound(payload)
    })
  }

  initialize(userDataPath: string, getMainWindow: () => BrowserWindow | null): void {
    if (this.initialized) return
    this.initialized = true
    this.getMainWindow = getMainWindow
    this.client.setAuthDir(userDataPath)
    this.client.onStatus((status) => this.broadcastSession(status))

    void antiBanConfigRepository.get().then((config) => {
      this.rateLimiter.updateConfig(config)
    })

    this.queueTimer = setInterval(() => {
      void this.processQueue().catch((error) => logger.warn('WhatsApp queue processor error', error))
    }, 5000)

    void this.startBackgroundReconnect()
  }

  private startBackgroundReconnect(): void {
    if (this.autoReconnectRunning) return
    this.autoReconnectRunning = true

    void runWhatsAppAutoReconnect(this.client, (patch) => {
      this.broadcastSession({ ...this.client.getStatus(), ...patch })
    })
      .catch((error) => {
        logger.error('WhatsApp background reconnect failed', error)
        void this.client.closeWithoutLogout().finally(() => {
          this.client.clearAuthState()
          this.broadcastSession({
            ...this.client.getStatus(),
            state: 'disconnected',
            phone: null,
            qrDataUrl: null,
            connectedAt: null,
            reconnectAttempt: null,
            autoReconnectFailed: false,
            hasSavedSession: false,
            lastError: null
          })
        })
      })
      .finally(() => {
        this.autoReconnectRunning = false
      })
  }

  async getSessionStatus(): Promise<WhatsAppSessionStatus> {
    return {
      ...this.client.getStatus(),
      hasSavedSession: this.client.hasSavedSession()
    }
  }

  async connect(_user: AuthUser): Promise<WhatsAppSessionStatus> {
    this.client.setAutoReconnect(true)
    await this.client.connect()
    this.scheduleQueueProcessing()
    return {
      ...this.client.getStatus(),
      hasSavedSession: this.client.hasSavedSession(),
      reconnectAttempt: null,
      autoReconnectFailed: false
    }
  }

  async disconnect(_user: AuthUser): Promise<WhatsAppSessionStatus> {
    this.client.setAutoReconnect(false)
    await this.client.disconnect()
    const status: WhatsAppSessionStatus = {
      ...this.client.getStatus(),
      reconnectAttempt: null,
      autoReconnectFailed: false,
      hasSavedSession: false
    }
    this.broadcastSession(status)
    return status
  }

  async getMenuConfig() {
    return menuConfigRepository.get()
  }

  async saveMenuConfig(_user: AuthUser, input: MenuConfigInput) {
    if (_user.role !== 'admin') {
      throw new Error('Only administrators can edit the WhatsApp menu.')
    }
    return menuConfigRepository.save(input)
  }

  async getAntiBanConfig() {
    return antiBanConfigRepository.get()
  }

  async saveAntiBanConfig(user: AuthUser, input: AntiBanConfigInput) {
    if (user.role !== 'admin') {
      throw new Error('Only administrators can edit anti-ban settings.')
    }
    const saved = await antiBanConfigRepository.save(input)
    this.rateLimiter.updateConfig(saved)
    return saved
  }

  async getMessagingConfig() {
    return whatsappMessagingConfigRepository.get()
  }

  async saveMessagingConfig(user: AuthUser, input: WhatsAppMessagingConfigInput) {
    if (user.role !== 'admin') {
      throw new Error('Only administrators can edit WhatsApp messaging settings.')
    }
    return whatsappMessagingConfigRepository.save(input)
  }

  async listInbox(user: AuthUser) {
    return conversationsRepository.listForInbox(user.id)
  }

  async listMessages(conversationId: string) {
    await conversationsRepository.markRead(conversationId)
    this.notifyInbox()
    return messagesRepository.listByConversation(conversationId)
  }

  async assignConversation(user: AuthUser, input: AssignConversationInput) {
    const assignedTo =
      input.userId && ObjectId.isValid(input.userId) ? new ObjectId(input.userId) : null
    const assignedToName = assignedTo ? user.displayName : null

    if (user.role !== 'admin' && assignedTo && !assignedTo.equals(new ObjectId(user.id))) {
      throw new Error('Staff can only assign conversations to themselves.')
    }

    const conversation = await conversationsRepository.assign(
      input.conversationId,
      assignedTo,
      assignedToName
    )
    if (!conversation) throw new Error('Conversation not found.')
    this.notifyInbox()
    return conversation
  }

  async reply(user: AuthUser, input: ReplyInput): Promise<void> {
    const conversation = await conversationsRepository.getById(input.conversationId)
    if (!conversation) throw new Error('Conversation not found.')

    await conversationsRepository.lock(input.conversationId, new ObjectId(user.id), user.displayName)

    try {
      await this.sendOutbound({
        phone: conversation.phone,
        body: input.body,
        messageType: 'manual_reply',
        user
      })

      await messagesRepository.createMessage({
        conversationId: conversation.id,
        direction: 'outbound',
        body: input.body,
        sentBy: new ObjectId(user.id),
        sentByName: user.displayName
      })

      await conversationsRepository.touchOutbound(conversation.id, input.body)
      await conversationsRepository.setStatus(conversation.id, 'waiting_customer')
    } finally {
      await conversationsRepository.unlock(input.conversationId, new ObjectId(user.id))
    }

    this.notifyInbox()
  }

  async sendBill(user: AuthUser, input: SendBillInput): Promise<QueueMessage> {
    const order = await ordersRepository.getById(input.orderId)
    if (!order) throw new Error('Order not found.')

    const customer = order.customerId ? await customersRepository.getById(order.customerId) : null
    const phone = input.phone ?? customer?.phone ?? ''
    if (!phone || !isValidPhone(phone)) {
      throw new Error('Customer phone is required to send a bill on WhatsApp.')
    }

    const billType = input.billType ?? 'simple'
    const invoice = getOrderInvoices(order).find((entry) => entry.billType === billType)
    if (!invoice?.billFilePath) {
      throw new Error(`Generate a ${billType} invoice before sending on WhatsApp.`)
    }

    const company = await companyRepository.getProfile()
    const body = renderTemplate('Your bill {invoiceNo} from {shopName} is attached.', {
      invoiceNo: invoice.invoiceNo,
      shopName: company.name
    })

    const queued = await messageQueueRepository.enqueue({
      type: 'bill',
      phone: normalizePhone(phone),
      body,
      customerId: order.customerId,
      customerName: order.customerName,
      orderId: order.id,
      filePath: invoice.billFilePath,
      requiresApproval: false,
      createdBy: new ObjectId(user.id),
      createdByName: user.displayName
    })

    if (this.client.getStatus().state !== 'ready') {
      logger.info('Bill queued while WhatsApp is disconnected', { orderId: order.id, queueId: queued.id })
    } else if (this.rateLimiter.isOutboundPaused()) {
      logger.info('Bill queued while outbound sending is paused', { orderId: order.id, queueId: queued.id })
    }

    this.scheduleQueueProcessing()
    return queued
  }

  async sendTemplate(user: AuthUser, input: SendTemplateInput): Promise<QueueMessage> {
    if (!isValidPhone(input.phone)) {
      throw new Error('Valid customer phone is required.')
    }

    const company = await companyRepository.getProfile()
    const customer = await customersRepository.findByPhone(normalizePhone(input.phone))
    const order = input.orderId ? await ordersRepository.getById(input.orderId) : null

    const variables: Record<string, string | number | null | undefined> = {
      shopName: company.name,
      customerName: customer?.name ?? input.variables?.customerName ?? 'Customer',
      creditBalance: customer?.creditBalance ?? 0,
      orderNo: order?.orderNo ?? input.variables?.orderNo,
      amount: order?.totals.grandTotal,
      status: order?.status,
      ...input.variables
    }

    const templateBody =
      input.templateKey === 'custom'
        ? (input.body ?? '')
        : renderTemplate(await this.getTemplateBody(input.templateKey), variables)

    if (!templateBody.trim()) {
      throw new Error('Message body is required.')
    }

    const requiresApproval = input.templateKey === 'credit_reminder'

    const queued = await messageQueueRepository.enqueue({
      type: requiresApproval ? 'reminder' : 'template',
      phone: normalizePhone(input.phone),
      body: templateBody,
      customerId: customer?.id ?? null,
      customerName: customer?.name ?? null,
      orderId: order?.id ?? null,
      requiresApproval,
      createdBy: new ObjectId(user.id),
      createdByName: user.displayName
    })
    if (!requiresApproval) {
      this.scheduleQueueProcessing()
    }
    return queued
  }

  async listPendingQueue(_user: AuthUser): Promise<QueueMessage[]> {
    return messageQueueRepository.listPendingApproval()
  }

  async listDeliveryQueue(_user: AuthUser, input: QueueDeliveryListInput = {}): Promise<QueueDeliveryListResult> {
    return messageQueueRepository.listDeliveryPaginated(input)
  }

  async approveQueue(user: AuthUser, input: ApproveQueueInput): Promise<QueueMessage> {
    if (user.role !== 'admin') {
      throw new Error('Only administrators can approve queued messages.')
    }
    const approved = await messageQueueRepository.approve(input.queueId)
    if (!approved) throw new Error('Queued message not found.')
    this.scheduleQueueProcessing()
    return approved
  }

  async retryQueue(user: AuthUser, queueId: string): Promise<QueueMessage> {
    if (user.role !== 'admin') {
      throw new Error('Only administrators can retry queued messages.')
    }
    const retried = await messageQueueRepository.retry(queueId)
    if (!retried) throw new Error('Failed message not found or not retryable.')
    this.scheduleQueueProcessing()
    return retried
  }

  async listLogs() {
    return whatsappLogsRepository.listRecent()
  }

  async notifyOrderCreated(order: import('@shared/types/order').Order): Promise<void> {
    const config = await whatsappMessagingConfigRepository.get()
    if (!config.autoSendOrderOnCreate || !order.customerId) return

    const customer = await customersRepository.getById(order.customerId)
    if (!customer?.phone || !isValidPhone(customer.phone)) {
      logger.info('WhatsApp order create message skipped: customer phone missing', {
        orderId: order.id,
        customerId: order.customerId
      })
      return
    }

    const company = await companyRepository.getProfile()
    const body = renderTemplate(config.templates.order_confirm, {
      shopName: company.name,
      customerName: customer.name,
      creditBalance: customer.creditBalance,
      orderNo: order.orderNo,
      amount: order.totals.grandTotal,
      status: order.status.replaceAll('_', ' ')
    })

    await messageQueueRepository.enqueue({
      type: 'template',
      phone: normalizePhone(customer.phone),
      body,
      customerId: customer.id,
      customerName: customer.name,
      orderId: order.id,
      requiresApproval: false,
      createdBy: ObjectId.isValid(order.createdBy) ? new ObjectId(order.createdBy) : new ObjectId(),
      createdByName: order.createdByName
    })
    this.scheduleQueueProcessing()
  }

  async notifyInvoiceGenerated(
    order: import('@shared/types/order').Order,
    user: AuthUser,
    billType: 'simple' | 'gst'
  ): Promise<void> {
    const config = await whatsappMessagingConfigRepository.get()
    if (!config.autoSendInvoiceOnBillGenerate || !order.customerId) return

    const customer = await customersRepository.getById(order.customerId)
    if (!customer?.phone || !isValidPhone(customer.phone)) {
      logger.info('WhatsApp invoice message skipped: customer phone missing', {
        orderId: order.id,
        customerId: order.customerId
      })
      return
    }

    const invoice = getOrderInvoices(order).find((entry) => entry.billType === billType)
    if (!invoice?.billFilePath) {
      logger.warn('WhatsApp invoice message skipped: invoice file missing', {
        orderId: order.id,
        billType
      })
      return
    }

    const company = await companyRepository.getProfile()
    const body = renderTemplate(config.templates.order_with_invoice, {
      shopName: company.name,
      customerName: customer.name,
      creditBalance: customer.creditBalance,
      orderNo: order.orderNo,
      invoiceNo: invoice.invoiceNo,
      amount: order.totals.grandTotal,
      status: order.status.replaceAll('_', ' ')
    })

    await messageQueueRepository.enqueue({
      type: 'bill',
      phone: normalizePhone(customer.phone),
      body,
      customerId: customer.id,
      customerName: customer.name,
      orderId: order.id,
      filePath: invoice.billFilePath,
      requiresApproval: false,
      createdBy: new ObjectId(user.id),
      createdByName: user.displayName
    })
    this.scheduleQueueProcessing()
  }

  async handleOrderCreateAutomation(user: AuthUser, order: import('@shared/types/order').Order): Promise<void> {
    const config = await whatsappMessagingConfigRepository.get()

    if (config.autoSendOrderOnCreate) {
      await this.notifyOrderCreated(order)
    }

    if (!config.autoSendInvoiceOnBillGenerate) {
      return
    }

    if (!order.customerId) {
      logger.info('WhatsApp bill on order create skipped: no customer on order', { orderId: order.id })
      return
    }

    const customer = await customersRepository.getById(order.customerId)
    if (!customer?.phone || !isValidPhone(customer.phone)) {
      logger.info('WhatsApp bill on order create skipped: customer phone missing', {
        orderId: order.id,
        customerId: order.customerId
      })
      return
    }

    if (this.client.getStatus().state !== 'ready') {
      logger.info('WhatsApp bill on order create skipped: WhatsApp not connected', { orderId: order.id })
      return
    }

    let workingOrder = order

    if (order.type === 'retail' && order.status === 'draft') {
      const confirmed = await ordersRepository.updateStatus(order.id, 'confirmed')
      if (!confirmed) {
        logger.warn('WhatsApp bill on order create skipped: could not confirm retail order', {
          orderId: order.id
        })
        return
      }
      workingOrder = confirmed
      await stockService.maybeDeductOnStatus(workingOrder, 'confirmed')
      if (config.autoSendOrderConfirmOnStatus) {
        await this.notifyOrderStatus(workingOrder, 'confirmed')
      }
    } else if (order.type === 'delivery' && order.status !== 'delivered') {
      logger.info('WhatsApp bill on order create skipped: delivery order must be delivered first', {
        orderId: order.id
      })
      return
    }

    if (canGenerateBillType(workingOrder, 'simple')) {
      const { billingService } = await import('./billing.service')
      await billingService.generateBill(user, { orderId: workingOrder.id, billType: 'simple' })
      return
    }

    const existing = getOrderInvoices(workingOrder).find((entry) => entry.billType === 'simple')
    if (existing?.billFilePath) {
      await this.notifyInvoiceGenerated(workingOrder, user, 'simple')
    }
  }

  async notifyOrderStatus(order: import('@shared/types/order').Order, status: import('@shared/types/order').OrderStatus): Promise<void> {
    const config = await whatsappMessagingConfigRepository.get()
    if (!order.customerId) return
    const customer = await customersRepository.getById(order.customerId)
    if (!customer?.phone || !isValidPhone(customer.phone)) return

    const company = await companyRepository.getProfile()
    const variables = {
      shopName: company.name,
      customerName: customer.name,
      creditBalance: customer.creditBalance,
      orderNo: order.orderNo,
      amount: order.totals.grandTotal,
      status: status.replaceAll('_', ' ')
    }

    if (
      config.autoSendOrderConfirmOnStatus &&
      order.type === 'retail' &&
      status === 'confirmed'
    ) {
      await messageQueueRepository.enqueue({
        type: 'template',
        phone: normalizePhone(customer.phone),
        body: renderTemplate(config.templates.order_confirm, variables),
        customerId: customer.id,
        customerName: customer.name,
        orderId: order.id,
        requiresApproval: false,
        createdBy: ObjectId.isValid(order.createdBy) ? new ObjectId(order.createdBy) : new ObjectId(),
        createdByName: order.createdByName
      })
    }

    if (
      config.autoSendDeliveryUpdate &&
      order.type === 'delivery' &&
      (status === 'out_for_delivery' || status === 'delivered')
    ) {
      await messageQueueRepository.enqueue({
        type: 'template',
        phone: normalizePhone(customer.phone),
        body: renderTemplate(config.templates.delivery_update, variables),
        customerId: customer.id,
        customerName: customer.name,
        orderId: order.id,
        requiresApproval: false,
        createdBy: ObjectId.isValid(order.createdBy) ? new ObjectId(order.createdBy) : new ObjectId(),
        createdByName: order.createdByName
      })
    }

    this.scheduleQueueProcessing()
  }

  private scheduleQueueProcessing(): void {
    void this.processQueue().catch((error) => logger.warn('WhatsApp queue processor error', error))
  }

  private async getTemplateBody(key: SystemTemplateKey): Promise<string> {
    const config = await whatsappMessagingConfigRepository.get()
    return config.templates[key]
  }

  private async handleInbound(payload: Parameters<InboundHandler>[0]): Promise<void> {
    const { phone, body, waMessageId } = payload
    const normalized = normalizePhone(phone)
    const customer = await customersRepository.findByPhone(normalized)
    const conversation = await conversationsRepository.upsertInbound(normalized, body, customer)

    await messagesRepository.createMessage({
      conversationId: conversation.id,
      direction: 'inbound',
      body,
      waMessageId
    })

    await whatsappLogsRepository.log({
      phone: normalized,
      direction: 'inbound',
      messageType: 'text',
      bodyPreview: body,
      success: true
    })

    const [messagingConfig, menuConfig] = await Promise.all([
      whatsappMessagingConfigRepository.get(),
      menuConfigRepository.get()
    ])

    const isMenuInput = matchesMenuInput(body, menuConfig.keywords, messagingConfig.menuUseRegex)
    const skipAutoReply =
      (messagingConfig.skipBusinessAccounts && payload.isBusinessAccount) ||
      (messagingConfig.skipQuotedReplies && payload.isQuotedReply && !isMenuInput)

    if (skipAutoReply) {
      logger.info('Skipping WhatsApp auto-reply', {
        phone: normalized,
        quoted: payload.isQuotedReply,
        business: payload.isBusinessAccount,
        isMenuInput
      })
      this.notifyInbox()
      return
    }

    await this.routeMenuReply(normalized, body, conversation.id, customer, payload.remoteJid)
    this.notifyInbox()
  }

  private async routeMenuReply(
    phone: string,
    body: string,
    conversationId: string,
    customer: Awaited<ReturnType<typeof customersRepository.findByPhone>>,
    remoteJid: string
  ): Promise<void> {
    try {
      await this.routeMenuReplyInner(phone, body, conversationId, customer, remoteJid)
    } catch (error) {
      logger.warn('WhatsApp menu auto-reply failed', error)
    }
  }

  private async routeMenuReplyInner(
    phone: string,
    body: string,
    conversationId: string,
    customer: Awaited<ReturnType<typeof customersRepository.findByPhone>>,
    remoteJid: string
  ): Promise<void> {
    const [menu, config] = await Promise.all([
      menuConfigRepository.get(),
      whatsappMessagingConfigRepository.get()
    ])
    if (!menu.enabled) return

    const keywordMatch = matchMenuKeyword(body, menu.keywords, config.menuUseRegex)
    const selectedKey =
      keywordMatch?.menuKey === 'menu'
        ? null
        : (keywordMatch?.menuKey ?? matchMenuItemKey(body, config.menuUseRegex))

    if (keywordMatch?.menuKey === 'menu') {
      const company = await companyRepository.getProfile()
      const menuText = buildMenuText(menu.welcomeTemplate, menu.items, {
        shopName: company.name,
        customerName: customer?.name ?? 'Customer',
        creditBalance: customer?.creditBalance ?? 0
      })
      await this.sendAutoReply(remoteJid, { phone, body: menuText, messageType: 'menu_welcome' })
      return
    }

    if (keywordMatch && keywordMatch.menuKey !== 'menu') {
      const item = menu.items.find((entry) => entry.key === keywordMatch.menuKey && entry.enabled)
      if (item) {
        await this.executeMenuItem(phone, conversationId, customer, item, remoteJid)
        return
      }
    }

    if (!selectedKey) return

    const item = menu.items.find((entry) => entry.key === selectedKey && entry.enabled)
    if (!item) {
      await this.sendAutoReply(remoteJid, {
        phone,
        body: 'Sorry, that option is not available. Reply menu to see options.',
        messageType: 'menu_invalid'
      })
      return
    }

    await this.executeMenuItem(phone, conversationId, customer, item, remoteJid)
  }

  private async sendAutoReply(
    remoteJid: string,
    input: {
      phone: string
      body: string
      messageType: string
      filePath?: string
      fileName?: string
    }
  ): Promise<void> {
    await this.client.readUnseenMessages(remoteJid)
    await this.sendOutbound({ ...input, remoteJid, interactiveMenu: true })
  }

  private async executeMenuItem(
    phone: string,
    conversationId: string,
    customer: Awaited<ReturnType<typeof customersRepository.findByPhone>>,
    item: Awaited<ReturnType<typeof menuConfigRepository.get>>['items'][number],
    remoteJid: string
  ): Promise<void> {
    switch (item.action) {
      case 'send_text': {
        const company = await companyRepository.getProfile()
        const text = renderTemplate(item.textTemplate ?? item.label, {
          shopName: company.name,
          customerName: customer?.name ?? 'Customer',
          creditBalance: customer?.creditBalance ?? 0
        })
        await this.sendAutoReply(remoteJid, { phone, body: text, messageType: 'menu_text' })
        break
      }
      case 'send_pdf': {
        if (!customer) {
          await this.sendAutoReply(remoteJid, {
            phone,
            body: 'We could not find your customer profile. Please contact staff.',
            messageType: 'menu_pdf_missing'
          })
          break
        }
        const orders = await ordersRepository.list({ search: customer.phone, limit: 5 })
        const billed = orders.items.find((order) => getOrderInvoices(order).length > 0)
        const invoice = billed ? getOrderInvoices(billed)[0] : null
        if (!invoice?.billFilePath) {
          await this.sendAutoReply(remoteJid, {
            phone,
            body: 'No recent bill found. Please contact staff for assistance.',
            messageType: 'menu_pdf_missing'
          })
          break
        }
        await this.sendAutoReply(remoteJid, {
          phone,
          body: `Your bill ${invoice.invoiceNo}`,
          messageType: 'menu_pdf',
          filePath: invoice.billFilePath,
          fileName: basename(invoice.billFilePath)
        })
        break
      }
      case 'open_staff_queue':
      case 'trigger_flow': {
        if (item.action === 'trigger_flow') {
          const company = await companyRepository.getProfile()
          const text = renderTemplate(item.textTemplate ?? 'Connecting you with staff.', {
            shopName: company.name,
            customerName: customer?.name ?? 'Customer',
            creditBalance: customer?.creditBalance ?? 0
          })
          await this.sendAutoReply(remoteJid, { phone, body: text, messageType: 'menu_flow' })
        } else {
          await this.sendAutoReply(remoteJid, {
            phone,
            body: 'A staff member will reply shortly. Thank you for your patience.',
            messageType: 'menu_staff_queue'
          })
        }
        await conversationsRepository.setStatus(conversationId, 'open')
        break
      }
    }
  }

  private async sendOutbound(input: {
    phone: string
    body: string
    messageType: string
    filePath?: string
    fileName?: string
    user?: AuthUser
    remoteJid?: string
    interactiveMenu?: boolean
    fromQueue?: boolean
  }): Promise<void> {
    const phone = normalizePhone(input.phone)
    const check = this.rateLimiter.canSend(phone, {
      bypassCustomerGap:
        input.fromQueue ?? input.interactiveMenu ?? input.messageType.startsWith('menu_')
    })
    if (!check.allowed) {
      throw new Error(check.reason ?? 'Send blocked by anti-ban rules.')
    }

    const config = await whatsappMessagingConfigRepository.get()
    const sendOptions = {
      ...(config.showTypingIndicator
        ? { showTyping: true, typingMs: config.typingDurationMs }
        : {}),
      jid: input.remoteJid
    }

    try {
      if (input.filePath) {
        await this.client.sendDocument(
          phone,
          input.filePath,
          input.body,
          input.fileName,
          sendOptions
        )
      } else {
        await this.client.sendText(phone, input.body, sendOptions)
      }
      this.rateLimiter.recordSend(phone, true)
      await whatsappLogsRepository.log({
        phone,
        direction: 'outbound',
        messageType: input.messageType,
        bodyPreview: input.body,
        success: true
      })
    } catch (error) {
      this.rateLimiter.recordSend(phone, false)
      const message = error instanceof Error ? error.message : 'Send failed'
      await whatsappLogsRepository.log({
        phone,
        direction: 'outbound',
        messageType: input.messageType,
        bodyPreview: input.body,
        success: false,
        error: message
      })
      throw error
    }
  }

  private async processQueue(): Promise<void> {
    if (this.client.getStatus().state !== 'ready') return
    if (this.rateLimiter.isOutboundPaused()) return

    await messageQueueRepository.recoverStaleProcessing()

    const jobs = await messageQueueRepository.claimApproved(3)
    for (const job of jobs) {
      try {
        if (job.filePath && !existsSync(job.filePath)) {
          throw new Error('Invoice PDF file is missing on disk.')
        }

        await this.sendOutbound({
          phone: job.phone,
          body: job.body,
          messageType: job.type,
          filePath: job.filePath ?? undefined,
          fileName: job.filePath ? basename(job.filePath) : undefined,
          fromQueue: true
        })

        const conversation = await conversationsRepository.findByPhone(job.phone)
        if (conversation) {
          await messagesRepository.createMessage({
            conversationId: conversation.id,
            direction: 'outbound',
            body: job.body,
            mediaType: job.filePath ? 'document' : 'text',
            mediaPath: job.filePath,
            sentBy: new ObjectId(job.createdBy),
            sentByName: job.createdByName
          })
          await conversationsRepository.touchOutbound(conversation.id, job.body)
        }

        await messageQueueRepository.updateStatus(job.id, 'sent')
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Send failed'
        if (this.isTransientQueueError(message)) {
          await messageQueueRepository.reschedule(
            job.id,
            new Date(Date.now() + 30_000),
            message
          )
          logger.info('WhatsApp queue item rescheduled', { queueId: job.id, message })
        } else {
          await messageQueueRepository.updateStatus(job.id, 'failed', message)
          logger.warn('WhatsApp queue item failed', { queueId: job.id, message })
        }
      }
    }

    if (jobs.length > 0) {
      this.notifyInbox()
      if (jobs.length >= 3) {
        this.scheduleQueueProcessing()
      }
    }
  }

  private isTransientQueueError(message: string): boolean {
    const lower = message.toLowerCase()
    return (
      lower.includes('limit') ||
      lower.includes('wait before') ||
      lower.includes('not connected') ||
      lower.includes('paused')
    )
  }

  private broadcastSession(status: WhatsAppSessionStatus): void {
    if (status.state === 'ready') {
      this.scheduleQueueProcessing()
    }
    eventBus.emit(WHATSAPP_EVENTS.SESSION_CHANGED, status)
    this.getMainWindow?.()?.webContents.send(IPC_EVENTS.WHATSAPP_SESSION_CHANGED, status)
    if (status.qrDataUrl) {
      this.getMainWindow?.()?.webContents.send(IPC_EVENTS.WHATSAPP_QR_UPDATED, status.qrDataUrl)
    }
  }

  private notifyInbox(): void {
    eventBus.emit(WHATSAPP_EVENTS.INBOX_UPDATED, null)
    this.getMainWindow?.()?.webContents.send(IPC_EVENTS.WHATSAPP_INBOX_UPDATED)
  }
}

export const whatsappService = new WhatsAppService()
