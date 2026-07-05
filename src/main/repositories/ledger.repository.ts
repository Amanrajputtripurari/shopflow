import { ObjectId } from 'mongodb'

import { COLLECTIONS } from '@shared/constants/database'
import type { LedgerEntry, LedgerEntryDocument } from '@shared/types/ledger'
import { BaseRepository } from './base.repository'

function toDto(document: LedgerEntryDocument): LedgerEntry {
  return {
    id: document._id.toString(),
    customerId: document.customerId.toString(),
    customerName: document.customerName,
    orderId: document.orderId?.toString() ?? null,
    orderNo: document.orderNo,
    type: document.type,
    amount: document.amount,
    note: document.note,
    createdBy: document.createdBy.toString(),
    createdByName: document.createdByName,
    createdAt: document.createdAt.toISOString()
  }
}

export class LedgerRepository extends BaseRepository<LedgerEntryDocument> {
  constructor() {
    super(COLLECTIONS.CUSTOMER_LEDGER)
  }

  async listByCustomer(customerId: string): Promise<LedgerEntry[]> {
    if (!ObjectId.isValid(customerId)) return []
    const documents = await this.findMany(
      { customerId: new ObjectId(customerId) },
      { createdAt: -1 },
      200
    )
    return documents.map(toDto)
  }

  async createEntry(
    entry: Omit<LedgerEntryDocument, '_id' | 'createdAt'>
  ): Promise<LedgerEntry> {
    const document: LedgerEntryDocument = {
      _id: new ObjectId(),
      ...entry,
      createdAt: new Date()
    }
    const created = await this.insertOneAndReturn(document)
    return toDto(created)
  }

  async sumOutstandingCredit(): Promise<number> {
    const pipeline = [
      {
        $group: {
          _id: '$customerId',
          balance: {
            $sum: {
              $cond: [{ $eq: ['$type', 'debit'] }, '$amount', { $multiply: ['$amount', -1] }]
            }
          }
        }
      },
      { $match: { balance: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$balance' } } }
    ]

    const result = await this.collection.aggregate<{ total: number }>(pipeline).toArray()
    return result[0]?.total ?? 0
  }
}

export const ledgerRepository = new LedgerRepository()
