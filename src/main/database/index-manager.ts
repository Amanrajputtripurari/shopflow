import { ObjectId } from 'mongodb'

import {
  APP_META_ID,
  APP_SETTINGS_ID,
  COLLECTIONS,
  COMPANY_ID,
  CONFIG_SINGLETON_ID,
  DEFAULT_ADMIN,
  DEFAULT_ANTI_BAN,
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_WHATSAPP_MENU,
  DEFAULT_WHATSAPP_MESSAGING,
  SCHEMA_VERSION
} from '@shared/constants/database'
import { DEFAULT_INVOICE_LAYOUT_SEED } from '@shared/constants/invoice-layout'
import type { AppMetaDocument, AppSettingsDocument } from '@shared/types/settings'
import type { CompanyDocument } from '@shared/types/company'
import type { ExpenseCategoryDocument } from '@shared/types/expense'
import type {
  AntiBanConfigDocument,
  MenuConfigDocument,
  WhatsAppMessagingConfigDocument
} from '@shared/types/whatsapp'
import type { InvoiceLayoutDocument } from '@shared/types/invoice-layout'
import type { UserDocument } from '@shared/types/auth'
import { getDb } from './connection'
import { logger } from '../helpers/logger'
import { hashPassword } from '../helpers/password'

export async function ensurePhase0Indexes(): Promise<void> {
  const db = getDb()
  const users = db.collection(COLLECTIONS.USERS)

  try {
    await users.createIndex({ username: 1 }, { unique: true })
  } catch (error) {
    const code = (error as { code?: number }).code
    if (code !== 86) {
      throw error
    }

    // Replace legacy sparse index from early Phase 0 builds
    await users.dropIndex('username_1')
    await users.createIndex({ username: 1 }, { unique: true })
  }
}

export async function ensurePhase1Indexes(): Promise<void> {
  const db = getDb()

  await db.collection(COLLECTIONS.PRODUCTS).createIndex({ sku: 1 }, { unique: true })
  await db.collection(COLLECTIONS.PRODUCTS).createIndex({ name: 'text', sku: 'text' })
  await db.collection(COLLECTIONS.CUSTOMERS).createIndex({ phone: 1 })
  await db.collection(COLLECTIONS.CUSTOMERS).createIndex({ name: 'text', phone: 'text' })
  await db.collection(COLLECTIONS.ORDERS).createIndex({ orderNo: 1 }, { unique: true })
  await db.collection(COLLECTIONS.ORDERS).createIndex({ createdAt: -1 })
  await db.collection(COLLECTIONS.ORDERS).createIndex({ status: 1, type: 1 })

  logger.info('Phase 1 indexes ensured')
}

export async function ensureAppMeta(): Promise<AppMetaDocument> {
  const db = getDb()
  const collection = db.collection<AppMetaDocument>(COLLECTIONS.APP_META)
  const existing = await collection.findOne({ _id: APP_META_ID })

  if (existing) {
    return existing
  }

  const now = new Date()
  const document: AppMetaDocument = {
    _id: APP_META_ID,
    schemaVersion: SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now
  }

  await collection.insertOne(document)
  logger.info('app_meta initialized', { schemaVersion: SCHEMA_VERSION })
  return document
}

export async function ensureAppSettings(): Promise<AppSettingsDocument> {
  const db = getDb()
  const collection = db.collection<AppSettingsDocument>(COLLECTIONS.APP_SETTINGS)
  const existing = await collection.findOne({ _id: APP_SETTINGS_ID })

  if (existing) {
    return existing
  }

  const document: AppSettingsDocument = {
    _id: APP_SETTINGS_ID,
    setupComplete: false,
    companyName: '',
    theme: 'system',
    themeColor: 'default',
    updatedAt: new Date()
  }

  await collection.insertOne(document)
  return document
}

async function ensureCompanyFromSettings(): Promise<void> {
  const db = getDb()
  const settings = await db
    .collection<AppSettingsDocument>(COLLECTIONS.APP_SETTINGS)
    .findOne({ _id: APP_SETTINGS_ID })

  const companyCollection = db.collection<CompanyDocument>(COLLECTIONS.COMPANY)
  const existing = await companyCollection.findOne({ _id: COMPANY_ID })

  if (existing) {
    return
  }

  await companyCollection.insertOne({
    _id: COMPANY_ID,
    name: settings?.companyName ?? '',
    gstin: '',
    address: '',
    phone: '',
    defaultBillType: 'simple',
    simplePrefix: 'BILL',
    simpleNext: 1,
    gstPrefix: 'INV',
    gstNext: 1,
    stockTrackingEnabled: false,
    stockDeductOn: 'confirm',
    allowNegativeStock: false,
    updatedAt: new Date()
  })
}

async function ensureDefaultAdmin(): Promise<void> {
  const db = getDb()
  const users = db.collection<UserDocument>(COLLECTIONS.USERS)
  const existing = await users.findOne({ username: DEFAULT_ADMIN.username })

  if (existing) {
    return
  }

  const now = new Date()
  const passwordHash = await hashPassword(DEFAULT_ADMIN.password)

  await users.insertOne({
    _id: new ObjectId(),
    username: DEFAULT_ADMIN.username,
    passwordHash,
    displayName: DEFAULT_ADMIN.displayName,
    role: 'admin',
    active: true,
    createdAt: now,
    updatedAt: now
  })

  logger.info('Default admin user created', { username: DEFAULT_ADMIN.username })
}

async function bumpSchemaVersion(): Promise<void> {
  const db = getDb()
  await db.collection<AppMetaDocument>(COLLECTIONS.APP_META).updateOne(
    { _id: APP_META_ID },
    {
      $set: {
        schemaVersion: SCHEMA_VERSION,
        updatedAt: new Date()
      }
    }
  )
}

async function runPhase2Migration(): Promise<void> {
  const db = getDb()

  await db.collection(COLLECTIONS.ORDERS).updateMany(
    { billingStatus: { $exists: false } },
    {
      $set: {
        billingStatus: 'none',
        billType: null,
        invoiceNo: null,
        paymentStatus: 'unpaid',
        paidAmount: 0,
        creditAmount: 0,
        paymentMode: null,
        billedAt: null,
        billFilePath: null,
        stockDeducted: false
      }
    }
  )

  await db.collection(COLLECTIONS.PRODUCTS).updateMany(
    { hsnCode: { $exists: false } },
    {
      $set: {
        hsnCode: '',
        currentStock: 0,
        trackStock: false,
        lowStockAlert: 0
      }
    }
  )

  await db.collection(COLLECTIONS.CUSTOMERS).updateMany(
    { creditBalance: { $exists: false } },
    { $set: { creditBalance: 0 } }
  )

  const companyCol = db.collection<CompanyDocument>(COLLECTIONS.COMPANY)
  const companyDoc = await companyCol.findOne({ _id: COMPANY_ID })

  if (companyDoc) {
    const patch: Partial<CompanyDocument> = {}
    if (companyDoc.defaultBillType === undefined) patch.defaultBillType = 'simple'
    if (companyDoc.simplePrefix === undefined) patch.simplePrefix = 'BILL'
    if (companyDoc.simpleNext === undefined) patch.simpleNext = 1
    if (companyDoc.gstPrefix === undefined) patch.gstPrefix = 'INV'
    if (companyDoc.gstNext === undefined) patch.gstNext = 1
    if (companyDoc.stockTrackingEnabled === undefined) patch.stockTrackingEnabled = false
    if (companyDoc.stockDeductOn === undefined) patch.stockDeductOn = 'confirm'
    if (companyDoc.allowNegativeStock === undefined) patch.allowNegativeStock = false

    if (Object.keys(patch).length > 0) {
      patch.updatedAt = new Date()
      await companyCol.updateOne({ _id: COMPANY_ID }, { $set: patch })
    }
  }

  await db.collection(COLLECTIONS.CUSTOMER_LEDGER).createIndex({ customerId: 1, createdAt: -1 })
  await db.collection(COLLECTIONS.CUSTOMER_LEDGER).createIndex({ orderId: 1 })

  const ordersCol = db.collection(COLLECTIONS.ORDERS)
  const legacyBilled = await ordersCol
    .find({
      invoiceNo: { $nin: [null, ''] },
      billFilePath: { $nin: [null, ''] },
      $or: [{ invoices: { $exists: false } }, { invoices: { $size: 0 } }]
    })
    .toArray()

  for (const order of legacyBilled) {
    await ordersCol.updateOne(
      { _id: order._id },
      {
        $set: {
          invoices: [
            {
              billType: order.billType ?? 'simple',
              invoiceNo: order.invoiceNo,
              billFilePath: order.billFilePath,
              billedAt: order.billedAt ?? order.updatedAt ?? new Date()
            }
          ]
        }
      }
    )
  }

  await ordersCol.updateMany({ invoices: { $exists: false } }, { $set: { invoices: [] } })

  logger.info('Phase 2 migration data backfill completed')
}

export async function ensurePhase2Indexes(): Promise<void> {
  logger.info('Phase 2 indexes ensured')
}

async function runPhase3Migration(): Promise<void> {
  const db = getDb()
  const categories = db.collection<ExpenseCategoryDocument>(COLLECTIONS.EXPENSE_CATEGORIES)
  const existingCount = await categories.countDocuments()

  if (existingCount === 0) {
    const now = new Date()
    await categories.insertMany(
      DEFAULT_EXPENSE_CATEGORIES.map((name) => ({
        _id: new ObjectId(),
        name,
        active: true,
        createdAt: now,
        updatedAt: now
      }))
    )
  }

  await db.collection(COLLECTIONS.EXPENSES).createIndex({ date: -1 })
  await db.collection(COLLECTIONS.EXPENSES).createIndex({ categoryId: 1, date: -1 })
  await db.collection(COLLECTIONS.EXPENSE_CATEGORIES).createIndex({ name: 1 }, { unique: true })

  logger.info('Phase 3 migration completed')
}

export async function ensurePhase3Indexes(): Promise<void> {
  const db = getDb()
  await db.collection(COLLECTIONS.EXPENSES).createIndex({ date: -1 })
  await db.collection(COLLECTIONS.EXPENSES).createIndex({ categoryId: 1, date: -1 })
  await db.collection(COLLECTIONS.EXPENSE_CATEGORIES).createIndex({ name: 1 }, { unique: true })
  logger.info('Phase 3 indexes ensured')
}

async function runPhase4Migration(): Promise<void> {
  const db = getDb()
  const now = new Date()

  const menuCol = db.collection<MenuConfigDocument>(COLLECTIONS.MENU_CONFIG)
  const menuExisting = await menuCol.findOne({ _id: CONFIG_SINGLETON_ID })
  if (!menuExisting) {
    await menuCol.insertOne({
      _id: CONFIG_SINGLETON_ID,
      enabled: DEFAULT_WHATSAPP_MENU.enabled,
      welcomeTemplate: DEFAULT_WHATSAPP_MENU.welcomeTemplate,
      items: [...DEFAULT_WHATSAPP_MENU.items],
      keywords: { ...DEFAULT_WHATSAPP_MENU.keywords },
      updatedAt: now
    })
  }

  const antiBanCol = db.collection<AntiBanConfigDocument>(COLLECTIONS.ANTI_BAN_CONFIG)
  const antiBanExisting = await antiBanCol.findOne({ _id: CONFIG_SINGLETON_ID })
  if (!antiBanExisting) {
    await antiBanCol.insertOne({
      _id: CONFIG_SINGLETON_ID,
      ...DEFAULT_ANTI_BAN,
      updatedAt: now
    })
  }

  await db.collection(COLLECTIONS.CONVERSATIONS).createIndex({ phone: 1 }, { unique: true })
  await db.collection(COLLECTIONS.CONVERSATIONS).createIndex({ lastMessageAt: -1 })
  await db.collection(COLLECTIONS.CONVERSATIONS).createIndex({ assignedTo: 1, status: 1 })
  await db.collection(COLLECTIONS.MESSAGES).createIndex({ conversationId: 1, createdAt: -1 })
  await db.collection(COLLECTIONS.MESSAGE_QUEUE).createIndex({ status: 1, scheduledAt: 1 })
  await db.collection(COLLECTIONS.WHATSAPP_LOGS).createIndex({ createdAt: -1 })

  logger.info('Phase 4 migration completed')
}

async function runPhase5Migration(): Promise<void> {
  const db = getDb()
  const now = new Date()

  const messagingCol = db.collection<WhatsAppMessagingConfigDocument>(
    COLLECTIONS.WHATSAPP_MESSAGING_CONFIG
  )
  const messagingExisting = await messagingCol.findOne({ _id: CONFIG_SINGLETON_ID })
  if (!messagingExisting) {
    await messagingCol.insertOne({
      _id: CONFIG_SINGLETON_ID,
      showTypingIndicator: DEFAULT_WHATSAPP_MESSAGING.showTypingIndicator,
      typingDurationMs: DEFAULT_WHATSAPP_MESSAGING.typingDurationMs,
      skipQuotedReplies: DEFAULT_WHATSAPP_MESSAGING.skipQuotedReplies,
      skipBusinessAccounts: DEFAULT_WHATSAPP_MESSAGING.skipBusinessAccounts,
      menuUseRegex: DEFAULT_WHATSAPP_MESSAGING.menuUseRegex,
      autoSendOrderOnCreate: DEFAULT_WHATSAPP_MESSAGING.autoSendOrderOnCreate,
      autoSendOrderConfirmOnStatus: DEFAULT_WHATSAPP_MESSAGING.autoSendOrderConfirmOnStatus,
      autoSendDeliveryUpdate: DEFAULT_WHATSAPP_MESSAGING.autoSendDeliveryUpdate,
      autoSendInvoiceOnBillGenerate: DEFAULT_WHATSAPP_MESSAGING.autoSendInvoiceOnBillGenerate,
      templates: { ...DEFAULT_WHATSAPP_MESSAGING.templates },
      updatedAt: now
    })
  }

  logger.info('Phase 5 migration completed')
}

async function runPhase6Migration(): Promise<void> {
  const db = getDb()
  const now = new Date()
  const col = db.collection<InvoiceLayoutDocument>(COLLECTIONS.INVOICE_LAYOUTS)
  const existing = await col.findOne({})
  if (!existing) {
    await col.insertOne({
      _id: new ObjectId(),
      name: DEFAULT_INVOICE_LAYOUT_SEED.name,
      description: DEFAULT_INVOICE_LAYOUT_SEED.description,
      billTypes: [...DEFAULT_INVOICE_LAYOUT_SEED.billTypes],
      isDefault: DEFAULT_INVOICE_LAYOUT_SEED.isDefault,
      pageWidth: DEFAULT_INVOICE_LAYOUT_SEED.pageWidth,
      pageHeight: DEFAULT_INVOICE_LAYOUT_SEED.pageHeight,
      margin: DEFAULT_INVOICE_LAYOUT_SEED.margin,
      fields: DEFAULT_INVOICE_LAYOUT_SEED.fields.map((field) => ({ ...field })),
      createdAt: now,
      updatedAt: now
    })
  }

  await col.createIndex({ isDefault: 1 })
  await col.createIndex({ billTypes: 1 })
  logger.info('Phase 6 migration completed')
}

export async function ensurePhase4Indexes(): Promise<void> {
  const db = getDb()
  await db.collection(COLLECTIONS.CONVERSATIONS).createIndex({ phone: 1 }, { unique: true })
  await db.collection(COLLECTIONS.CONVERSATIONS).createIndex({ lastMessageAt: -1 })
  await db.collection(COLLECTIONS.CONVERSATIONS).createIndex({ assignedTo: 1, status: 1 })
  await db.collection(COLLECTIONS.MESSAGES).createIndex({ conversationId: 1, createdAt: -1 })
  await db.collection(COLLECTIONS.MESSAGE_QUEUE).createIndex({ status: 1, scheduledAt: 1 })
  await db.collection(COLLECTIONS.WHATSAPP_LOGS).createIndex({ createdAt: -1 })
  logger.info('Phase 4 indexes ensured')
}

export async function runMigrations(): Promise<void> {
  const meta = await ensureAppMeta()
  await ensureAppSettings()
  await ensurePhase0Indexes()
  await ensureDefaultAdmin()

  if (meta.schemaVersion < 2) {
    await ensureCompanyFromSettings()
    await ensurePhase1Indexes()
    await bumpSchemaVersion()
    logger.info('Phase 1 migration completed')
    meta.schemaVersion = 2
  } else {
    await ensurePhase1Indexes()
  }

  if (meta.schemaVersion < 3) {
    await runPhase2Migration()
    await ensurePhase2Indexes()
    await bumpSchemaVersion()
    logger.info('Phase 2 migration completed')
  } else {
    await ensurePhase2Indexes()
  }

  if (meta.schemaVersion < 4) {
    await runPhase3Migration()
    await ensurePhase3Indexes()
    await bumpSchemaVersion()
    logger.info('Phase 3 migration completed')
  } else {
    await ensurePhase3Indexes()
  }

  if (meta.schemaVersion < 5) {
    await runPhase4Migration()
    await ensurePhase4Indexes()
    await bumpSchemaVersion()
    logger.info('Phase 4 migration completed')
  } else {
    await ensurePhase4Indexes()
  }

  if (meta.schemaVersion < 6) {
    await runPhase5Migration()
    await bumpSchemaVersion()
    logger.info('Phase 5 migration completed')
  }

  if (meta.schemaVersion < 7) {
    await runPhase6Migration()
    await bumpSchemaVersion()
    logger.info('Phase 6 migration completed')
  }
}

/** @deprecated use runMigrations */
export async function runPhase0Migrations(): Promise<void> {
  await runMigrations()
}
