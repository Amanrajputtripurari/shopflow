import { INVOICE_LAYOUT_VARIABLES } from '@shared/constants/invoice-layout'
import type { InvoiceLayoutField } from '@shared/types/invoice-layout'
import type { BillType } from '@shared/types/order'

const SAMPLE_LINE_ITEMS = [
  { name: 'Basmati Rice 1kg', qty: '2', rate: '120', amount: '240' },
  { name: 'Sunflower Oil 1L', qty: '1', rate: '185', amount: '185' },
  { name: 'Masala Pack', qty: '3', rate: '45', amount: '135' },
  { name: 'Tea 500g', qty: '1', rate: '220', amount: '220' }
]

export function buildPreviewVariables(billType: BillType = 'simple'): Record<string, string> {
  const map: Record<string, string> = {}
  for (const variable of INVOICE_LAYOUT_VARIABLES) {
    map[variable.key] = variable.sample
  }
  map['invoice.title'] = billType === 'gst' ? 'TAX INVOICE' : 'BILL / INVOICE'
  map['order.type'] = 'retail'
  map['totals.subtotal'] = '780'
  map['totals.discount'] = '20'
  map['totals.tax'] = billType === 'gst' ? '38' : '27'
  map['totals.extra'] = '40'
  map['totals.grand'] = billType === 'gst' ? '838' : '827'
  return map
}

export function renderTemplateText(template: string, variables: Record<string, string>): string {
  return template.replace(/\{([a-z0-9._]+)\}/gi, (_match, key: string) => variables[key] ?? `{${key}}`)
}

export function resolveFieldPreviewText(field: InvoiceLayoutField, variables: Record<string, string>): string {
  if (field.type === 'variable') {
    return variables[field.content]?.trim() || `{${field.content}}`
  }
  if (field.type === 'text') {
    return renderTemplateText(field.content, variables)
  }
  return field.content
}

export function getSampleLineItems() {
  return SAMPLE_LINE_ITEMS
}
