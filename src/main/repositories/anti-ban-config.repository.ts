import { ObjectId } from 'mongodb'

import { COLLECTIONS, CONFIG_SINGLETON_ID } from '@shared/constants/database'
import type {
  AntiBanConfig,
  AntiBanConfigDocument,
  AntiBanConfigInput
} from '@shared/types/whatsapp'
import { BaseRepository } from './base.repository'

function toDto(document: AntiBanConfigDocument): AntiBanConfig {
  return {
    maxPerMinute: document.maxPerMinute,
    maxPerHour: document.maxPerHour,
    minGapSameCustomerMs: document.minGapSameCustomerMs,
    pauseOnFailureRate: document.pauseOnFailureRate,
    outboundPaused: document.outboundPaused
  }
}

export class AntiBanConfigRepository extends BaseRepository<AntiBanConfigDocument> {
  constructor() {
    super(COLLECTIONS.ANTI_BAN_CONFIG)
  }

  async get(): Promise<AntiBanConfig> {
    const document = await this.findOne({ _id: CONFIG_SINGLETON_ID })
    return document ? toDto(document) : {
      maxPerMinute: 4,
      maxPerHour: 40,
      minGapSameCustomerMs: 120_000,
      pauseOnFailureRate: 0.3,
      outboundPaused: false
    }
  }

  async save(input: AntiBanConfigInput): Promise<AntiBanConfig> {
    const existing = await this.findOne({ _id: CONFIG_SINGLETON_ID })
    const document: AntiBanConfigDocument = {
      _id: CONFIG_SINGLETON_ID,
      maxPerMinute: input.maxPerMinute ?? existing?.maxPerMinute ?? 4,
      maxPerHour: input.maxPerHour ?? existing?.maxPerHour ?? 40,
      minGapSameCustomerMs:
        input.minGapSameCustomerMs ?? existing?.minGapSameCustomerMs ?? 120_000,
      pauseOnFailureRate: input.pauseOnFailureRate ?? existing?.pauseOnFailureRate ?? 0.3,
      outboundPaused: input.outboundPaused ?? existing?.outboundPaused ?? false,
      updatedAt: new Date()
    }
    await this.replaceOne({ _id: CONFIG_SINGLETON_ID }, document)
    return toDto(document)
  }
}

export const antiBanConfigRepository = new AntiBanConfigRepository()
