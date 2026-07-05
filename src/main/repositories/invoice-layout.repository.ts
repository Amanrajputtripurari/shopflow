import { ObjectId } from 'mongodb'

import { COLLECTIONS } from '@shared/constants/database'
import type {
  InvoiceLayout,
  InvoiceLayoutDocument,
  InvoiceLayoutInput
} from '@shared/types/invoice-layout'
import { BaseRepository } from './base.repository'

function toDto(document: InvoiceLayoutDocument): InvoiceLayout {
  return {
    id: document._id.toString(),
    name: document.name,
    description: document.description,
    billTypes: document.billTypes,
    isDefault: document.isDefault,
    pageWidth: document.pageWidth,
    pageHeight: document.pageHeight,
    margin: document.margin,
    fields: document.fields,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString()
  }
}

export class InvoiceLayoutRepository extends BaseRepository<InvoiceLayoutDocument> {
  constructor() {
    super(COLLECTIONS.INVOICE_LAYOUTS)
  }

  async list(): Promise<InvoiceLayout[]> {
    const documents = await this.findMany({}, { isDefault: -1, updatedAt: -1 }, 100)
    return documents.map(toDto)
  }

  async getById(id: string): Promise<InvoiceLayout | null> {
    if (!ObjectId.isValid(id)) return null
    const document = await this.findOne({ _id: new ObjectId(id) })
    return document ? toDto(document) : null
  }

  async getDefaultForBillType(billType: import('@shared/types/order').BillType): Promise<InvoiceLayout | null> {
    const preferred = await this.findOne({ isDefault: true, billTypes: billType })
    if (preferred) return toDto(preferred)

    const fallback = await this.findOne({ billTypes: billType })
    if (fallback) return toDto(fallback)

    const anyDefault = await this.findOne({ isDefault: true })
    return anyDefault ? toDto(anyDefault) : null
  }

  async create(input: InvoiceLayoutInput): Promise<InvoiceLayout> {
    const now = new Date()
    if (input.isDefault) {
      await this.collection.updateMany(
        { isDefault: true },
        { $set: { isDefault: false, updatedAt: now } }
      )
    }

    const document: InvoiceLayoutDocument = {
      _id: new ObjectId(),
      name: input.name.trim(),
      description: input.description?.trim() ?? '',
      billTypes: input.billTypes,
      isDefault: input.isDefault ?? false,
      pageWidth: input.pageWidth ?? 595,
      pageHeight: input.pageHeight ?? 842,
      margin: input.margin ?? 50,
      fields: input.fields,
      createdAt: now,
      updatedAt: now
    }

    const created = await this.insertOneAndReturn(document)
    return toDto(created)
  }

  async update(id: string, input: InvoiceLayoutInput): Promise<InvoiceLayout | null> {
    if (!ObjectId.isValid(id)) return null
    const existing = await this.findOne({ _id: new ObjectId(id) })
    if (!existing) return null

    const now = new Date()
    if (input.isDefault) {
      await this.collection.updateMany(
        { _id: { $ne: existing._id }, isDefault: true },
        { $set: { isDefault: false, updatedAt: now } }
      )
    }

    const document: InvoiceLayoutDocument = {
      ...existing,
      name: input.name.trim(),
      description: input.description?.trim() ?? '',
      billTypes: input.billTypes,
      isDefault: input.isDefault ?? existing.isDefault,
      pageWidth: input.pageWidth ?? existing.pageWidth,
      pageHeight: input.pageHeight ?? existing.pageHeight,
      margin: input.margin ?? existing.margin,
      fields: input.fields,
      updatedAt: now
    }

    await this.replaceOne({ _id: existing._id }, document)
    return toDto(document)
  }

  async delete(id: string): Promise<boolean> {
    if (!ObjectId.isValid(id)) return false
    const existing = await this.findOne({ _id: new ObjectId(id) })
    if (!existing) return false

    await this.deleteOne({ _id: existing._id })

    if (existing.isDefault) {
      const [next] = await this.findMany({}, { updatedAt: -1 }, 1)
      if (next) {
        await this.updateOne({ _id: next._id }, { $set: { isDefault: true, updatedAt: new Date() } })
      }
    }

    return true
  }

  async duplicate(id: string, name: string): Promise<InvoiceLayout | null> {
    const source = await this.getById(id)
    if (!source) return null

    return this.create({
      name: name.trim(),
      description: source.description,
      billTypes: [...source.billTypes],
      isDefault: false,
      pageWidth: source.pageWidth,
      pageHeight: source.pageHeight,
      margin: source.margin,
      fields: source.fields.map((field) => ({ ...field, id: `${field.id}-${Date.now()}` }))
    })
  }
}

export const invoiceLayoutRepository = new InvoiceLayoutRepository()
