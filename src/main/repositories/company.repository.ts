import { COMPANY_ID, COLLECTIONS } from '@shared/constants/database'
import type { BillType } from '@shared/types/order'
import type {
  CompanyDocument,
  CompanyInput,
  CompanyProfile
} from '@shared/types/company'
import { BaseRepository } from './base.repository'

function toDto(document: CompanyDocument): CompanyProfile {
  return {
    name: document.name,
    gstin: document.gstin,
    address: document.address,
    phone: document.phone,
    defaultBillType: document.defaultBillType ?? 'simple',
    billingSeries: {
      simplePrefix: document.simplePrefix ?? 'BILL',
      simpleNext: document.simpleNext ?? 1,
      gstPrefix: document.gstPrefix ?? 'INV',
      gstNext: document.gstNext ?? 1
    },
    stockSettings: {
      stockTrackingEnabled: document.stockTrackingEnabled ?? false,
      stockDeductOn: document.stockDeductOn ?? 'confirm',
      allowNegativeStock: document.allowNegativeStock ?? false
    }
  }
}

export class CompanyRepository extends BaseRepository<CompanyDocument> {
  constructor() {
    super(COLLECTIONS.COMPANY)
  }

  async getProfile(): Promise<CompanyProfile> {
    const document = await this.findOne({ _id: COMPANY_ID })
    if (!document) {
      throw new Error('Company profile not initialized.')
    }
    return toDto(document)
  }

  async getDocument(): Promise<CompanyDocument> {
    const document = await this.findOne({ _id: COMPANY_ID })
    if (!document) {
      throw new Error('Company profile not initialized.')
    }
    return document
  }

  async saveProfile(input: CompanyInput): Promise<CompanyProfile> {
    const existing = await this.findOne({ _id: COMPANY_ID })
    const updated: CompanyDocument = {
      _id: COMPANY_ID,
      name: input.name?.trim() ?? existing?.name ?? '',
      gstin: input.gstin?.trim() ?? existing?.gstin ?? '',
      address: input.address?.trim() ?? existing?.address ?? '',
      phone: input.phone?.trim() ?? existing?.phone ?? '',
      defaultBillType: input.defaultBillType ?? existing?.defaultBillType ?? 'simple',
      simplePrefix: input.billingSeries?.simplePrefix ?? existing?.simplePrefix ?? 'BILL',
      simpleNext: input.billingSeries?.simpleNext ?? existing?.simpleNext ?? 1,
      gstPrefix: input.billingSeries?.gstPrefix ?? existing?.gstPrefix ?? 'INV',
      gstNext: input.billingSeries?.gstNext ?? existing?.gstNext ?? 1,
      stockTrackingEnabled:
        input.stockSettings?.stockTrackingEnabled ?? existing?.stockTrackingEnabled ?? false,
      stockDeductOn: input.stockSettings?.stockDeductOn ?? existing?.stockDeductOn ?? 'confirm',
      allowNegativeStock:
        input.stockSettings?.allowNegativeStock ?? existing?.allowNegativeStock ?? false,
      updatedAt: new Date()
    }

    await this.replaceOne({ _id: COMPANY_ID }, updated)
    return toDto(updated)
  }

  async nextInvoiceNumber(billType: BillType): Promise<string> {
    const document = await this.getDocument()
    const year = new Date().getFullYear()

    if (billType === 'gst') {
      const invoiceNo = `${document.gstPrefix}-${year}-${String(document.gstNext).padStart(4, '0')}`
      await this.updateOne(
        { _id: COMPANY_ID },
        { $set: { gstNext: document.gstNext + 1, updatedAt: new Date() } }
      )
      return invoiceNo
    }

    const invoiceNo = `${document.simplePrefix}-${year}-${String(document.simpleNext).padStart(4, '0')}`
    await this.updateOne(
      { _id: COMPANY_ID },
      { $set: { simpleNext: document.simpleNext + 1, updatedAt: new Date() } }
    )
    return invoiceNo
  }
}

export const companyRepository = new CompanyRepository()
