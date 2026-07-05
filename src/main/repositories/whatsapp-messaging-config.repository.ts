import {
  CONFIG_SINGLETON_ID,
  COLLECTIONS,
  DEFAULT_WHATSAPP_MESSAGING
} from '@shared/constants/database'
import type {
  SystemTemplates,
  WhatsAppMessagingConfig,
  WhatsAppMessagingConfigDocument,
  WhatsAppMessagingConfigInput
} from '@shared/types/whatsapp'
import { BaseRepository } from './base.repository'

function toDto(document: WhatsAppMessagingConfigDocument): WhatsAppMessagingConfig {
  return {
    showTypingIndicator: document.showTypingIndicator,
    typingDurationMs: document.typingDurationMs,
    skipQuotedReplies: document.skipQuotedReplies,
    skipBusinessAccounts: document.skipBusinessAccounts,
    menuUseRegex: document.menuUseRegex,
    autoSendOrderOnCreate: document.autoSendOrderOnCreate,
    autoSendOrderConfirmOnStatus: document.autoSendOrderConfirmOnStatus,
    autoSendDeliveryUpdate: document.autoSendDeliveryUpdate,
    autoSendInvoiceOnBillGenerate: document.autoSendInvoiceOnBillGenerate,
    templates: { ...document.templates }
  }
}

function mergeTemplates(
  existing: SystemTemplates,
  patch?: Partial<SystemTemplates>
): SystemTemplates {
  if (!patch) return { ...existing }
  return {
    order_confirm: patch.order_confirm ?? existing.order_confirm,
    delivery_update: patch.delivery_update ?? existing.delivery_update,
    credit_reminder: patch.credit_reminder ?? existing.credit_reminder,
    order_with_invoice: patch.order_with_invoice ?? existing.order_with_invoice
  }
}

export class WhatsAppMessagingConfigRepository extends BaseRepository<WhatsAppMessagingConfigDocument> {
  constructor() {
    super(COLLECTIONS.WHATSAPP_MESSAGING_CONFIG)
  }

  async get(): Promise<WhatsAppMessagingConfig> {
    const document = await this.findOne({ _id: CONFIG_SINGLETON_ID })
    if (document) return toDto(document)

    return {
      showTypingIndicator: DEFAULT_WHATSAPP_MESSAGING.showTypingIndicator,
      typingDurationMs: DEFAULT_WHATSAPP_MESSAGING.typingDurationMs,
      skipQuotedReplies: DEFAULT_WHATSAPP_MESSAGING.skipQuotedReplies,
      skipBusinessAccounts: DEFAULT_WHATSAPP_MESSAGING.skipBusinessAccounts,
      menuUseRegex: DEFAULT_WHATSAPP_MESSAGING.menuUseRegex,
      autoSendOrderOnCreate: DEFAULT_WHATSAPP_MESSAGING.autoSendOrderOnCreate,
      autoSendOrderConfirmOnStatus: DEFAULT_WHATSAPP_MESSAGING.autoSendOrderConfirmOnStatus,
      autoSendDeliveryUpdate: DEFAULT_WHATSAPP_MESSAGING.autoSendDeliveryUpdate,
      autoSendInvoiceOnBillGenerate: DEFAULT_WHATSAPP_MESSAGING.autoSendInvoiceOnBillGenerate,
      templates: { ...DEFAULT_WHATSAPP_MESSAGING.templates }
    }
  }

  async save(input: WhatsAppMessagingConfigInput): Promise<WhatsAppMessagingConfig> {
    const existing = await this.get()
    const document: WhatsAppMessagingConfigDocument = {
      _id: CONFIG_SINGLETON_ID,
      showTypingIndicator: input.showTypingIndicator ?? existing.showTypingIndicator,
      typingDurationMs: input.typingDurationMs ?? existing.typingDurationMs,
      skipQuotedReplies: input.skipQuotedReplies ?? existing.skipQuotedReplies,
      skipBusinessAccounts: input.skipBusinessAccounts ?? existing.skipBusinessAccounts,
      menuUseRegex: input.menuUseRegex ?? existing.menuUseRegex,
      autoSendOrderOnCreate: input.autoSendOrderOnCreate ?? existing.autoSendOrderOnCreate,
      autoSendOrderConfirmOnStatus:
        input.autoSendOrderConfirmOnStatus ?? existing.autoSendOrderConfirmOnStatus,
      autoSendDeliveryUpdate: input.autoSendDeliveryUpdate ?? existing.autoSendDeliveryUpdate,
      autoSendInvoiceOnBillGenerate:
        input.autoSendInvoiceOnBillGenerate ?? existing.autoSendInvoiceOnBillGenerate,
      templates: mergeTemplates(existing.templates, input.templates),
      updatedAt: new Date()
    }
    await this.replaceOne({ _id: CONFIG_SINGLETON_ID }, document)
    return toDto(document)
  }
}

export const whatsappMessagingConfigRepository = new WhatsAppMessagingConfigRepository()
