import { createWriteStream, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import PDFDocument from 'pdfkit'
import { app } from 'electron'

import type { BillType } from '@shared/types/order'
import type { Order } from '@shared/types/order'
import type { CompanyProfile } from '@shared/types/company'
import type { Customer } from '@shared/types/customer'
import type { InvoiceLayout, InvoiceLayoutField } from '@shared/types/invoice-layout'
import { formatCurrencyInr } from '../helpers/format'
import {
  buildInvoiceVariableMap,
  renderLayoutText,
  resolveLayoutVariable
} from './layout-variables'
import { formatBillLineItemLabel } from './line-item-label'

function getBillsDirectory(): string {
  const dir = join(app.getPath('userData'), 'bills')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return dir
}

function writePdf(doc: PDFKit.PDFDocument, filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const stream = createWriteStream(filePath)
    doc.pipe(stream)
    doc.end()
    stream.on('finish', () => resolve())
    stream.on('error', reject)
  })
}

function resolveExtraCharges(order: Order): number {
  const fromTotals = order.totals.deliveryCharge ?? 0
  const fromDelivery = order.delivery?.charge ?? 0
  return Math.max(fromTotals, fromDelivery)
}

function applyFont(doc: PDFKit.PDFDocument, field: InvoiceLayoutField): void {
  doc.font(field.fontWeight === 'bold' ? 'Helvetica-Bold' : 'Helvetica').fontSize(field.fontSize)
}

function drawLineItems(
  doc: PDFKit.PDFDocument,
  field: InvoiceLayoutField,
  order: Order,
  billType: BillType
): void {
  applyFont(doc, field)
  const startY = field.y
  let y = startY

  doc.font('Helvetica-Bold')
  doc.text('Item', field.x, y, { continued: true, width: 180 })
  doc.text('Qty', { continued: true, width: 40 })
  doc.text('Rate', { continued: true, width: 60 })
  if (billType === 'gst') doc.text('HSN', { continued: true, width: 50 })
  doc.text('Tax%', { continued: true, width: 40 })
  doc.text('Amount', { width: 70, align: 'right' })
  doc.font('Helvetica')

  y = doc.y + 4
  doc.moveTo(field.x, y).lineTo(field.x + field.width, y).stroke()
  y += 8

  for (const line of order.lines) {
    doc.text(formatBillLineItemLabel(line), field.x, y, { width: 180 })
    doc.text(String(line.qty), field.x + 180, y, { width: 40 })
    doc.text(formatCurrencyInr(line.rate), field.x + 220, y, { width: 60 })
    if (billType === 'gst') {
      doc.text(line.hsnSnapshot || '-', field.x + 280, y, { width: 50 })
    }
    doc.text(`${line.taxPercent}%`, field.x + (billType === 'gst' ? 330 : 280), y, { width: 40 })
    doc.text(formatCurrencyInr(line.lineTotal), field.x + field.width - 75, y, {
      width: 75,
      align: 'right'
    })
    y += 18
  }
}

function drawTotals(
  doc: PDFKit.PDFDocument,
  field: InvoiceLayoutField,
  order: Order,
  billType: BillType
): void {
  applyFont(doc, field)
  const extraCharges = resolveExtraCharges(order)
  const lines = [`Subtotal: ${formatCurrencyInr(order.totals.subtotal)}`]

  if (order.totals.discount > 0) {
    lines.push(`Discount: ${formatCurrencyInr(order.totals.discount)}`)
  }

  lines.push(`Tax: ${formatCurrencyInr(order.totals.tax)}`)

  if (extraCharges > 0) {
    const label = order.type === 'delivery' ? 'Extra charges (Delivery)' : 'Extra charges'
    lines.push(`${label}: ${formatCurrencyInr(extraCharges)}`)
  }

  if (billType === 'gst' && order.totals.tax > 0) {
    const half = order.totals.tax / 2
    lines.push(`CGST: ${formatCurrencyInr(half)}`)
    lines.push(`SGST: ${formatCurrencyInr(half)}`)
  }

  lines.push(`Grand Total: ${formatCurrencyInr(order.totals.grandTotal)}`)

  doc.font('Helvetica-Bold').text(lines.join('\n'), field.x, field.y, {
    width: field.width,
    align: field.align
  })
  doc.font('Helvetica')
}

function drawField(
  doc: PDFKit.PDFDocument,
  field: InvoiceLayoutField,
  variables: Record<string, string>,
  order: Order,
  billType: BillType
): void {
  if (!field.visible) return

  switch (field.type) {
    case 'divider':
      doc.moveTo(field.x, field.y).lineTo(field.x + field.width, field.y).stroke()
      return
    case 'line_items':
      drawLineItems(doc, field, order, billType)
      return
    case 'totals':
      drawTotals(doc, field, order, billType)
      return
    case 'text': {
      applyFont(doc, field)
      const text = renderLayoutText(field.content, variables)
      if (!text.trim()) return
      doc.text(text, field.x, field.y, { width: field.width, align: field.align })
      return
    }
    case 'variable': {
      applyFont(doc, field)
      const value = resolveLayoutVariable(field.content, variables)
      if (!value) return
      doc.text(value, field.x, field.y, { width: field.width, align: field.align })
      return
    }
  }
}

export async function generateBillPdfFromLayout(options: {
  layout: InvoiceLayout
  order: Order
  company: CompanyProfile
  customer: Customer | null
  billType: BillType
  invoiceNo: string
}): Promise<string> {
  const { layout, order, company, customer, billType, invoiceNo } = options
  const filePath = join(getBillsDirectory(), `${invoiceNo.replaceAll('/', '-')}.pdf`)
  const doc = new PDFDocument({
    margin: layout.margin,
    size: [layout.pageWidth, layout.pageHeight]
  })

  const variables = buildInvoiceVariableMap({ order, company, customer, billType, invoiceNo })
  const fields = [...layout.fields].sort((a, b) => a.y - b.y || a.x - b.x)

  for (const field of fields) {
    drawField(doc, field, variables, order, billType)
  }

  await writePdf(doc, filePath)
  return filePath
}

export function getBillsFolder(): string {
  return getBillsDirectory()
}
