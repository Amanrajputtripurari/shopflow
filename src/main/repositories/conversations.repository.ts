import { ObjectId } from 'mongodb'

import { COLLECTIONS } from '@shared/constants/database'
import type {
  ChatMessage,
  Conversation,
  ConversationDocument,
  MessageDocument
} from '@shared/types/whatsapp'
import { BaseRepository } from './base.repository'

function conversationToDto(document: ConversationDocument): Conversation {
  return {
    id: document._id.toString(),
    phone: document.phone,
    customerId: document.customerId?.toString() ?? null,
    customerName: document.customerName,
    status: document.status,
    assignedTo: document.assignedTo?.toString() ?? null,
    assignedToName: document.assignedToName,
    lockedBy: document.lockedBy?.toString() ?? null,
    lockedByName: document.lockedByName,
    unreadCount: document.unreadCount,
    lastMessageAt: document.lastMessageAt.toISOString(),
    lastMessagePreview: document.lastMessagePreview,
    lastInboundAt: document.lastInboundAt?.toISOString() ?? null,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString()
  }
}

function messageToDto(document: MessageDocument): ChatMessage {
  return {
    id: document._id.toString(),
    conversationId: document.conversationId.toString(),
    direction: document.direction,
    body: document.body,
    mediaType: document.mediaType,
    mediaPath: document.mediaPath,
    waMessageId: document.waMessageId,
    sentBy: document.sentBy?.toString() ?? null,
    sentByName: document.sentByName,
    createdAt: document.createdAt.toISOString()
  }
}

export class ConversationsRepository extends BaseRepository<ConversationDocument> {
  constructor() {
    super(COLLECTIONS.CONVERSATIONS)
  }

  async findByPhone(phone: string): Promise<Conversation | null> {
    const document = await this.findOne({ phone })
    return document ? conversationToDto(document) : null
  }

  async getById(id: string): Promise<Conversation | null> {
    if (!ObjectId.isValid(id)) return null
    const document = await this.findOne({ _id: new ObjectId(id) })
    return document ? conversationToDto(document) : null
  }

  async upsertInbound(phone: string, preview: string, customer?: { id: string; name: string } | null): Promise<Conversation> {
    const now = new Date()
    const existing = await this.findOne({ phone })

    if (existing) {
      const updated: ConversationDocument = {
        ...existing,
        customerId: existing.customerId ?? (customer ? new ObjectId(customer.id) : null),
        customerName: existing.customerName ?? customer?.name ?? null,
        unreadCount: existing.unreadCount + 1,
        lastMessageAt: now,
        lastMessagePreview: preview.slice(0, 160),
        lastInboundAt: now,
        status: existing.status === 'closed' ? 'open' : existing.status,
        updatedAt: now
      }
      await this.replaceOne({ _id: existing._id }, updated)
      return conversationToDto(updated)
    }

    const document: ConversationDocument = {
      _id: new ObjectId(),
      phone,
      customerId: customer ? new ObjectId(customer.id) : null,
      customerName: customer?.name ?? null,
      status: 'open',
      assignedTo: null,
      assignedToName: null,
      lockedBy: null,
      lockedByName: null,
      unreadCount: 1,
      lastMessageAt: now,
      lastMessagePreview: preview.slice(0, 160),
      lastInboundAt: now,
      createdAt: now,
      updatedAt: now
    }
    await this.insertOne(document)
    return conversationToDto(document)
  }

  async touchOutbound(conversationId: string, preview: string): Promise<void> {
    if (!ObjectId.isValid(conversationId)) return
    const now = new Date()
    await this.updateOne(
      { _id: new ObjectId(conversationId) },
      {
        $set: {
          lastMessageAt: now,
          lastMessagePreview: preview.slice(0, 160),
          updatedAt: now
        }
      }
    )
  }

  async listForInbox(userId: string): Promise<Conversation[]> {
    const documents = await this.findMany({}, { lastMessageAt: -1 }, 300)
    const userObjectId = new ObjectId(userId)

    const sorted = documents.sort((a, b) => {
      const score = (doc: ConversationDocument) => {
        let value = 0
        if (!doc.assignedTo && doc.unreadCount > 0) value += 400
        if (doc.assignedTo?.equals(userObjectId) && doc.unreadCount > 0) value += 300
        if (doc.status === 'waiting_customer') value += 200
        value += doc.lastMessageAt.getTime() / 1_000_000_000
        return value
      }
      return score(b) - score(a)
    })

    return sorted.map(conversationToDto)
  }

  async assign(
    id: string,
    assignedTo: ObjectId | null,
    assignedToName: string | null
  ): Promise<Conversation | null> {
    if (!ObjectId.isValid(id)) return null
    const existing = await this.findOne({ _id: new ObjectId(id) })
    if (!existing) return null

    const updated: ConversationDocument = {
      ...existing,
      assignedTo,
      assignedToName,
      status: assignedTo ? 'assigned' : 'open',
      updatedAt: new Date()
    }
    await this.replaceOne({ _id: existing._id }, updated)
    return conversationToDto(updated)
  }

  async lock(id: string, userId: ObjectId, userName: string): Promise<Conversation | null> {
    if (!ObjectId.isValid(id)) return null
    const existing = await this.findOne({ _id: new ObjectId(id) })
    if (!existing) return null
    if (existing.lockedBy && !existing.lockedBy.equals(userId)) {
      throw new Error(`${existing.lockedByName ?? 'Another staff member'} is replying to this chat.`)
    }

    const updated: ConversationDocument = {
      ...existing,
      lockedBy: userId,
      lockedByName: userName,
      updatedAt: new Date()
    }
    await this.replaceOne({ _id: existing._id }, updated)
    return conversationToDto(updated)
  }

  async unlock(id: string, userId: ObjectId): Promise<void> {
    if (!ObjectId.isValid(id)) return
    await this.updateOne(
      { _id: new ObjectId(id), lockedBy: userId },
      { $set: { lockedBy: null, lockedByName: null, updatedAt: new Date() } }
    )
  }

  async markRead(id: string): Promise<void> {
    if (!ObjectId.isValid(id)) return
    await this.updateOne(
      { _id: new ObjectId(id) },
      { $set: { unreadCount: 0, updatedAt: new Date() } }
    )
  }

  async setStatus(id: string, status: Conversation['status']): Promise<void> {
    if (!ObjectId.isValid(id)) return
    await this.updateOne({ _id: new ObjectId(id) }, { $set: { status, updatedAt: new Date() } })
  }
}

export class MessagesRepository extends BaseRepository<MessageDocument> {
  constructor() {
    super(COLLECTIONS.MESSAGES)
  }

  async listByConversation(conversationId: string, limit = 100): Promise<ChatMessage[]> {
    if (!ObjectId.isValid(conversationId)) return []
    const documents = await this.findMany(
      { conversationId: new ObjectId(conversationId) },
      { createdAt: 1 },
      limit
    )
    return documents.map(messageToDto)
  }

  async createMessage(input: {
    conversationId: string
    direction: 'inbound' | 'outbound'
    body: string
    mediaType?: ChatMessage['mediaType']
    mediaPath?: string | null
    waMessageId?: string | null
    sentBy?: ObjectId | null
    sentByName?: string | null
  }): Promise<ChatMessage> {
    const document: MessageDocument = {
      _id: new ObjectId(),
      conversationId: new ObjectId(input.conversationId),
      direction: input.direction,
      body: input.body,
      mediaType: input.mediaType ?? 'text',
      mediaPath: input.mediaPath ?? null,
      waMessageId: input.waMessageId ?? null,
      sentBy: input.sentBy ?? null,
      sentByName: input.sentByName ?? null,
      createdAt: new Date()
    }
    const created = await this.insertOneAndReturn(document)
    return messageToDto(created)
  }
}

export const conversationsRepository = new ConversationsRepository()
export const messagesRepository = new MessagesRepository()
