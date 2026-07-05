import {
  INVOICE_DEFAULT_MARGIN,
  INVOICE_PAGE_HEIGHT,
  INVOICE_PAGE_WIDTH
} from '@shared/constants/invoice-layout'
import type { InvoiceLayoutField, InvoiceLayoutFieldType, InvoiceLayoutInput } from '@shared/types/invoice-layout'
import type { BillType } from '@shared/types/order'

export function createFieldId(prefix: string): string {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`
}

export function createDefaultField(type: InvoiceLayoutFieldType, y = 120): InvoiceLayoutField {
  const base = {
    id: createFieldId(type),
    visible: true,
    fontSize: 10,
    fontWeight: 'normal' as const,
    align: 'left' as const
  }

  switch (type) {
    case 'text':
      return {
        ...base,
        type,
        label: 'Text block',
        content: 'Your text here\nUse {invoice.number} for variables',
        x: INVOICE_DEFAULT_MARGIN,
        y,
        width: 240,
        height: 64
      }
    case 'variable':
      return {
        ...base,
        type,
        label: 'Variable',
        content: 'company.name',
        x: INVOICE_DEFAULT_MARGIN,
        y,
        width: 240,
        height: 20,
        fontWeight: 'bold',
        fontSize: 12
      }
    case 'line_items':
      return {
        ...base,
        type,
        label: 'Line items',
        content: '',
        x: INVOICE_DEFAULT_MARGIN,
        y,
        width: INVOICE_PAGE_WIDTH - INVOICE_DEFAULT_MARGIN * 2,
        height: 220
      }
    case 'totals':
      return {
        ...base,
        type,
        label: 'Totals',
        content: '',
        x: 280,
        y: y + 240,
        width: 265,
        height: 110,
        align: 'right'
      }
    case 'divider':
      return {
        ...base,
        type,
        label: 'Divider',
        content: '',
        x: INVOICE_DEFAULT_MARGIN,
        y,
        width: INVOICE_PAGE_WIDTH - INVOICE_DEFAULT_MARGIN * 2,
        height: 8
      }
  }
}

export function createEmptyLayoutInput(name = 'New layout'): InvoiceLayoutInput {
  return {
    name,
    description: '',
    billTypes: ['simple'] as BillType[],
    isDefault: false,
    pageWidth: INVOICE_PAGE_WIDTH,
    pageHeight: INVOICE_PAGE_HEIGHT,
    margin: INVOICE_DEFAULT_MARGIN,
    fields: []
  }
}

export function clampFieldToPage(field: InvoiceLayoutField, pageWidth: number, pageHeight: number): InvoiceLayoutField {
  const width = Math.max(24, Math.min(field.width, pageWidth - field.x))
  const height = Math.max(12, Math.min(field.height, pageHeight - field.y))
  const x = Math.max(0, Math.min(field.x, pageWidth - width))
  const y = Math.max(0, Math.min(field.y, pageHeight - height))
  return { ...field, x, y, width, height }
}
