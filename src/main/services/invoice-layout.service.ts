import type { AuthUser } from '@shared/types/auth'
import type { BillType } from '@shared/types/order'
import type { InvoiceLayout, InvoiceLayoutInput } from '@shared/types/invoice-layout'
import { invoiceLayoutRepository } from '../repositories/invoice-layout.repository'

export class InvoiceLayoutService {
  async list(_user: AuthUser): Promise<InvoiceLayout[]> {
    return invoiceLayoutRepository.list()
  }

  async get(_user: AuthUser, id: string): Promise<InvoiceLayout> {
    const layout = await invoiceLayoutRepository.getById(id)
    if (!layout) throw new Error('Invoice layout not found.')
    return layout
  }

  async getDefaultForBillType(billType: BillType): Promise<InvoiceLayout | null> {
    return invoiceLayoutRepository.getDefaultForBillType(billType)
  }

  async create(user: AuthUser, input: InvoiceLayoutInput): Promise<InvoiceLayout> {
    if (user.role !== 'admin') {
      throw new Error('Only administrators can create invoice layouts.')
    }
    this.validate(input)
    return invoiceLayoutRepository.create(input)
  }

  async update(user: AuthUser, id: string, input: InvoiceLayoutInput): Promise<InvoiceLayout> {
    if (user.role !== 'admin') {
      throw new Error('Only administrators can edit invoice layouts.')
    }
    this.validate(input)
    const layout = await invoiceLayoutRepository.update(id, input)
    if (!layout) throw new Error('Invoice layout not found.')
    return layout
  }

  async delete(user: AuthUser, id: string): Promise<void> {
    if (user.role !== 'admin') {
      throw new Error('Only administrators can delete invoice layouts.')
    }
    const deleted = await invoiceLayoutRepository.delete(id)
    if (!deleted) throw new Error('Invoice layout not found.')
  }

  async duplicate(user: AuthUser, id: string, name: string): Promise<InvoiceLayout> {
    if (user.role !== 'admin') {
      throw new Error('Only administrators can duplicate invoice layouts.')
    }
    if (!name.trim()) throw new Error('Layout name is required.')
    const layout = await invoiceLayoutRepository.duplicate(id, name)
    if (!layout) throw new Error('Invoice layout not found.')
    return layout
  }

  private validate(input: InvoiceLayoutInput): void {
    if (!input.name.trim()) throw new Error('Layout name is required.')
    if (!input.billTypes.length) throw new Error('Select at least one bill type.')
    if (!input.fields.length) throw new Error('Add at least one field to the layout.')
  }
}

export const invoiceLayoutService = new InvoiceLayoutService()
