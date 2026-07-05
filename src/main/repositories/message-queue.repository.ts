import { ObjectId } from 'mongodb'

import { COLLECTIONS } from '@shared/constants/database'
import { WHATSAPP_DELIVERY_QUEUE_DEFAULT_PAGE_SIZE } from '@shared/constants/whatsapp'
import type {
  MessageQueueDocument,
  QueueDeliveryListInput,
  QueueDeliveryListResult,
  QueueMessage,
  QueueMessageStatus,
  QueueMessageType
} from '@shared/types/whatsapp'
import { normalizePagination } from '@shared/types/pagination'
import { BaseRepository } from './base.repository'

function toDto(document: MessageQueueDocument): QueueMessage {
  return {
    id: document._id.toString(),
    type: document.type,
    phone: document.phone,
    customerId: document.customerId?.toString() ?? null,
    customerName: document.customerName,
    orderId: document.orderId?.toString() ?? null,
    body: document.body,
    filePath: document.filePath,
    requiresApproval: document.requiresApproval,
    status: document.status,
    scheduledAt: document.scheduledAt.toISOString(),
    sentAt: document.sentAt?.toISOString() ?? null,
    error: document.error,
    createdBy: document.createdBy.toString(),
    createdByName: document.createdByName,
    createdAt: document.createdAt.toISOString()
  }
}

export class MessageQueueRepository extends BaseRepository<MessageQueueDocument> {
  constructor() {
    super(COLLECTIONS.MESSAGE_QUEUE)
  }

  async enqueue(input: {
    type: QueueMessageType
    phone: string
    body: string
    customerId?: string | null
    customerName?: string | null
    orderId?: string | null
    filePath?: string | null
    requiresApproval?: boolean
    scheduledAt?: Date
    createdBy: ObjectId
    createdByName: string
  }): Promise<QueueMessage> {
    const now = new Date()
    const document: MessageQueueDocument = {
      _id: new ObjectId(),
      type: input.type,
      phone: input.phone,
      customerId: input.customerId && ObjectId.isValid(input.customerId) ? new ObjectId(input.customerId) : null,
      customerName: input.customerName ?? null,
      orderId: input.orderId && ObjectId.isValid(input.orderId) ? new ObjectId(input.orderId) : null,
      body: input.body,
      filePath: input.filePath ?? null,
      requiresApproval: input.requiresApproval ?? false,
      status: input.requiresApproval ? 'pending' : 'approved',
      scheduledAt: input.scheduledAt ?? now,
      sentAt: null,
      error: null,
      createdBy: input.createdBy,
      createdByName: input.createdByName,
      createdAt: now
    }
    const created = await this.insertOneAndReturn(document)
    return toDto(created)
  }

  async listPendingApproval(): Promise<QueueMessage[]> {
    const documents = await this.findMany({ status: 'pending' }, { createdAt: -1 }, 100)
    return documents.map(toDto)
  }

  async listRecentDelivery(limit = 50): Promise<QueueMessage[]> {
    const documents = await this.findMany(
      { status: { $in: ['approved', 'processing', 'failed', 'sent'] } },
      { createdAt: -1 },
      limit
    )
    return documents.map(toDto)
  }

  async listDeliveryPaginated(query: QueueDeliveryListInput = {}): Promise<QueueDeliveryListResult> {
    const { limit, offset } = normalizePagination(query, WHATSAPP_DELIVERY_QUEUE_DEFAULT_PAGE_SIZE)
    const filter = { status: { $in: ['approved', 'processing', 'failed', 'sent'] as QueueMessageStatus[] } }

    const [{ items, total }, queued, sending, failed, sent] = await Promise.all([
      this.findManyPaginated(filter, { createdAt: -1 }, { limit, offset }),
      this.count({ ...filter, status: 'approved' }),
      this.count({ ...filter, status: 'processing' }),
      this.count({ ...filter, status: 'failed' }),
      this.count({ ...filter, status: 'sent' })
    ])

    return {
      items: items.map(toDto),
      total,
      hasMore: offset + items.length < total,
      statusCounts: { queued, sending, failed, sent }
    }
  }

  async recoverStaleProcessing(maxAgeMs = 120_000): Promise<number> {
    const cutoff = new Date(Date.now() - maxAgeMs)
    const result = await this.collection.updateMany(
      { status: 'processing', scheduledAt: { $lte: cutoff } },
      { $set: { status: 'approved', error: 'Recovered after interrupted send.' } }
    )
    return result.modifiedCount
  }

  async claimApproved(limit = 5): Promise<QueueMessage[]> {
    const now = new Date()
    const claimed: QueueMessage[] = []

    for (let index = 0; index < limit; index += 1) {
      const result = await this.collection.findOneAndUpdate(
        { status: 'approved', scheduledAt: { $lte: now } },
        { $set: { status: 'processing' } },
        { sort: { scheduledAt: 1 }, returnDocument: 'after' }
      )

      const document = result as MessageQueueDocument | null
      if (!document) break
      claimed.push(toDto(document))
    }

    return claimed
  }

  async updateStatus(id: string, status: QueueMessageStatus, error?: string | null): Promise<void> {
    if (!ObjectId.isValid(id)) return
    await this.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status,
          error: error ?? null,
          sentAt: status === 'sent' ? new Date() : null
        }
      }
    )
  }

  async reschedule(id: string, scheduledAt: Date, error?: string | null): Promise<void> {
    if (!ObjectId.isValid(id)) return
    await this.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: 'approved',
          scheduledAt,
          error: error ?? null,
          sentAt: null
        }
      }
    )
  }

  async approve(id: string): Promise<QueueMessage | null> {
    if (!ObjectId.isValid(id)) return null
    const existing = await this.findOne({ _id: new ObjectId(id) })
    if (!existing) return null
    await this.updateOne({ _id: existing._id }, { $set: { status: 'approved' } })
    return toDto({ ...existing, status: 'approved' })
  }

  async retry(id: string): Promise<QueueMessage | null> {
    if (!ObjectId.isValid(id)) return null
    const existing = await this.findOne({ _id: new ObjectId(id) })
    if (!existing || existing.status !== 'failed') return null

    const document: MessageQueueDocument = {
      ...existing,
      status: 'approved',
      scheduledAt: new Date(),
      sentAt: null,
      error: null
    }
    await this.replaceOne({ _id: existing._id }, document)
    return toDto(document)
  }
}

export const messageQueueRepository = new MessageQueueRepository()
