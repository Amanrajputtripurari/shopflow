import { createWriteStream, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import PDFDocument from 'pdfkit'
import { app } from 'electron'

import type { BillType } from '@shared/types/order'
import type { Order } from '@shared/types/order'
import type { CompanyProfile } from '@shared/types/company'
import type { Customer } from '@shared/types/customer'
import { formatCurrencyInr } from '../helpers/format'
import { invoiceLayoutService } from '../services/invoice-layout.service'
import { generateBillPdfFromLayout } from './layout-pdf-renderer'
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

function resolveCustomerAddress(order: Order, customer: Customer | null): string {
  const deliveryAddress = order.delivery?.address?.trim()
  if (deliveryAddress) return deliveryAddress

  const profileAddress = customer?.address?.trim()
  if (profileAddress) return profileAddress

  return ''
}

function resolveExtraCharges(order: Order): number {
  const fromTotals = order.totals.deliveryCharge ?? 0
  const fromDelivery = order.delivery?.charge ?? 0
  return Math.max(fromTotals, fromDelivery)
}

function drawBillToBlock(
  doc: PDFKit.PDFDocument,
  order: Order,
  customer: Customer | null,
  billType: BillType,
  x: number,
  width: number,
  startY: number
): number {
  doc.font('Helvetica-Bold').fontSize(10).text('Bill To', x, startY, { width })
  doc.font('Helvetica').fontSize(10)

  doc.text(order.customerName || 'Walk-in Customer', x, doc.y, { width })

  const address = resolveCustomerAddress(order, customer)
  if (address) {
    doc.text(address, x, doc.y, { width })
  }

  const phone = customer?.phone?.trim()
  if (phone) {
    doc.text(`Phone: ${phone}`, x, doc.y, { width })
  }

  if (billType === 'gst' && customer?.gstin?.trim()) {
    doc.text(`GSTIN: ${customer.gstin.trim()}`, x, doc.y, { width })
  }

  return doc.y
}

export async function generateBillPdf(options: {
  order: Order
  company: CompanyProfile
  customer: Customer | null
  billType: BillType
  invoiceNo: string
}): Promise<string> {
  const layout = await invoiceLayoutService.getDefaultForBillType(options.billType)
  if (layout) {
    return generateBillPdfFromLayout({ ...options, layout })
  }

  return generateLegacyBillPdf(options)
}

async function generateLegacyBillPdf(options: {
  order: Order
  company: CompanyProfile
  customer: Customer | null
  billType: BillType
  invoiceNo: string
}): Promise<string> {
  const { order, company, customer, billType, invoiceNo } = options
  const filePath = join(getBillsDirectory(), `${invoiceNo.replaceAll('/', '-')}.pdf`)
  const doc = new PDFDocument({ margin: 50, size: 'A4' })
  const extraCharges = resolveExtraCharges(order)

  const title = billType === 'gst' ? 'TAX INVOICE' : 'BILL / INVOICE'

  doc.fontSize(18).text(company.name || 'ShopFlow', { align: 'center' })
  doc.fontSize(12).text(title, { align: 'center' })
  doc.moveDown(0.5)

  doc.fontSize(10).font('Helvetica')
  if (company.address) doc.text(company.address, { align: 'center' })
  if (company.phone) doc.text(`Phone: ${company.phone}`, { align: 'center' })
  if (billType === 'gst' && company.gstin) doc.text(`GSTIN: ${company.gstin}`, { align: 'center' })

  doc.moveDown(1)

  const metaTop = doc.y

  doc.font('Helvetica-Bold').fontSize(10).text('Invoice details', 50, metaTop)
  doc.font('Helvetica').fontSize(10)
  doc.text(`Invoice No: ${invoiceNo}`, 50)
  doc.text(`Order No: ${order.orderNo}`)
  doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`)
  doc.text(`Order type: ${order.type}`)
  const metaBottom = doc.y

  doc.y = metaTop
  const billToBottom = drawBillToBlock(doc, order, customer, billType, 320, 225, metaTop)

  doc.y = Math.max(metaBottom, billToBottom) + 20

  doc.font('Helvetica-Bold')
  doc.text('Item', 50, doc.y, { continued: true, width: 180 })
  doc.text('Qty', { continued: true, width: 40 })
  doc.text('Rate', { continued: true, width: 60 })
  if (billType === 'gst') doc.text('HSN', { continued: true, width: 50 })
  doc.text('Tax%', { continued: true, width: 40 })
  doc.text('Amount', { width: 70, align: 'right' })
  doc.font('Helvetica')

  doc.moveDown(0.3)
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke()
  doc.moveDown(0.3)

  for (const line of order.lines) {
    const y = doc.y
    doc.text(formatBillLineItemLabel(line), 50, y, { width: 180 })
    doc.text(String(line.qty), 230, y, { width: 40 })
    doc.text(formatCurrencyInr(line.rate), 270, y, { width: 60 })
    if (billType === 'gst') doc.text(line.hsnSnapshot || '-', 330, y, { width: 50 })
    doc.text(`${line.taxPercent}%`, billType === 'gst' ? 380 : 330, y, { width: 40 })
    doc.text(formatCurrencyInr(line.lineTotal), 470, y, { width: 75, align: 'right' })
    doc.moveDown()
  }

  doc.moveDown()
  doc.text(`Subtotal: ${formatCurrencyInr(order.totals.subtotal)}`, { align: 'right' })

  if (order.totals.discount > 0) {
    doc.text(`Discount: ${formatCurrencyInr(order.totals.discount)}`, { align: 'right' })
  }

  doc.text(`Tax: ${formatCurrencyInr(order.totals.tax)}`, { align: 'right' })

  if (extraCharges > 0) {
    const chargeLabel =
      order.type === 'delivery' ? 'Extra charges (Delivery)' : 'Extra charges'
    doc.text(`${chargeLabel}: ${formatCurrencyInr(extraCharges)}`, { align: 'right' })
  }

  if (billType === 'gst' && order.totals.tax > 0) {
    const half = order.totals.tax / 2
    doc.text(`CGST: ${formatCurrencyInr(half)}`, { align: 'right' })
    doc.text(`SGST: ${formatCurrencyInr(half)}`, { align: 'right' })
  }

  doc.font('Helvetica-Bold')
  doc.text(`Grand Total: ${formatCurrencyInr(order.totals.grandTotal)}`, { align: 'right' })
  doc.font('Helvetica')

  if (order.notes?.trim()) {
    doc.moveDown()
    doc.font('Helvetica-Bold').text('Notes:', 50)
    doc.font('Helvetica').text(order.notes.trim(), 50, doc.y, { width: 495 })
  }

  doc.moveDown(2)
  doc.fontSize(9).fillColor('#666').text('Generated by ShopFlow', { align: 'center' })

  await writePdf(doc, filePath)
  return filePath
}

export function getBillsFolder(): string {
  return getBillsDirectory()
}
