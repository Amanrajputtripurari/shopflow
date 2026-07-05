import { ObjectId } from 'mongodb'

import { COLLECTIONS } from '@shared/constants/database'
import type { WhatsAppLogDocument, WhatsAppLogEntry } from '@shared/types/whatsapp'
import { BaseRepository } from './base.repository'

function toDto(document: WhatsAppLogDocument): WhatsAppLogEntry {
  return {
    id: document._id.toString(),
    phone: document.phone,
    direction: document.direction,
    messageType: document.messageType,
    bodyPreview: document.bodyPreview,
    success: document.success,
    error: document.error,
    createdAt: document.createdAt.toISOString()
  }
}

export class WhatsAppLogsRepository extends BaseRepository<WhatsAppLogDocument> {
  constructor() {
    super(COLLECTIONS.WHATSAPP_LOGS)
  }

  async log(input: {
    phone: string
    direction: 'outbound' | 'inbound'
    messageType: string
    bodyPreview: string
    success: boolean
    error?: string | null
  }): Promise<void> {
    await this.insertOne({
      _id: new ObjectId(),
      phone: input.phone,
      direction: input.direction,
      messageType: input.messageType,
      bodyPreview: input.bodyPreview.slice(0, 200),
      success: input.success,
      error: input.error ?? null,
      createdAt: new Date()
    })
  }

  async listRecent(limit = 50): Promise<WhatsAppLogEntry[]> {
    const documents = await this.findMany({}, { createdAt: -1 }, limit)
    return documents.map(toDto)
  }
}

export const whatsappLogsRepository = new WhatsAppLogsRepository()
