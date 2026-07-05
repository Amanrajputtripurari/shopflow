import { readFileSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { basename } from 'node:path'
import { join } from 'node:path'

import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  isJidBot,
  isJidBroadcast,
  isJidGroup,
  isJidMetaAI,
  isJidNewsletter,
  isJidStatusBroadcast,
  useMultiFileAuthState,
  type proto,
  type WAMessageKey,
  type WASocket
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import QRCode from 'qrcode'

import type { WhatsAppSessionStatus } from '@shared/types/whatsapp'
import { logger } from '../helpers/logger'
import { jidToPhone, resolveInboundPhone, toWhatsAppJid } from './phone-utils'
import type { WhatsAppProvider } from './provider.interface'

const silentLogger = {
  level: 'silent',
  trace: () => undefined,
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  child: () => silentLogger
}

export type InboundHandler = (payload: {
  phone: string
  body: string
  waMessageId: string | null
  remoteJid: string
  isQuotedReply: boolean
  isBusinessAccount: boolean
}) => Promise<void> | void

export class BaileysClient implements WhatsAppProvider {
  private socket: WASocket | null = null
  private status: WhatsAppSessionStatus = {
    state: 'disconnected',
    phone: null,
    qrDataUrl: null,
    lastError: null,
    connectedAt: null
  }

  private authDir = ''
  private connecting = false
  private autoReconnectEnabled = true
  private intentionalDisconnect = false
  private onStatusChange?: (status: WhatsAppSessionStatus) => void
  private unreadKeysByJid = new Map<string, WAMessageKey[]>()

  constructor(private onInbound: InboundHandler) {}

  setAuthDir(userDataPath: string): void {
    this.authDir = join(userDataPath, 'whatsapp-auth')
    if (!existsSync(this.authDir)) {
      mkdirSync(this.authDir, { recursive: true })
    }
  }

  onStatus(callback: (status: WhatsAppSessionStatus) => void): void {
    this.onStatusChange = callback
  }

  getStatus(): WhatsAppSessionStatus {
    return { ...this.status }
  }

  hasSavedSession(): boolean {
    if (!this.authDir) return false
    return existsSync(join(this.authDir, 'creds.json'))
  }

  clearAuthState(): void {
    if (!this.authDir) return
    if (existsSync(this.authDir)) {
      rmSync(this.authDir, { recursive: true, force: true })
    }
    mkdirSync(this.authDir, { recursive: true })
  }

  setAutoReconnect(enabled: boolean): void {
    this.autoReconnectEnabled = enabled
  }

  waitForConnectionOutcome(timeoutMs: number): Promise<'ready' | 'qr' | 'error' | 'timeout'> {
    if (this.status.state === 'ready') return Promise.resolve('ready')
    if (this.status.state === 'qr') return Promise.resolve('qr')
    if (this.status.state === 'error') return Promise.resolve('error')

    return new Promise((resolve) => {
      const previousListener = this.onStatusChange

      const finish = (outcome: 'ready' | 'qr' | 'error' | 'timeout'): void => {
        clearTimeout(timeout)
        this.onStatusChange = previousListener
        resolve(outcome)
      }

      const timeout = setTimeout(() => finish('timeout'), timeoutMs)

      this.onStatusChange = (status) => {
        previousListener?.(status)

        if (status.state === 'ready') {
          finish('ready')
          return
        }

        if (status.state === 'qr') {
          finish('qr')
          return
        }

        if (status.state === 'error') {
          finish('error')
        }
      }
    })
  }

  async closeWithoutLogout(): Promise<void> {
    this.connecting = false
    if (this.socket) {
      this.socket.ev.removeAllListeners('connection.update')
      this.socket.ev.removeAllListeners('creds.update')
      this.socket.ev.removeAllListeners('messages.upsert')
      this.socket.end(undefined)
      this.socket = null
    }
    this.updateStatus({
      state: 'disconnected',
      qrDataUrl: null,
      lastError: null
    })
  }

  async connect(): Promise<void> {
    if (this.status.state === 'ready' || this.connecting) return
    if (!this.authDir) {
      throw new Error('WhatsApp auth directory is not configured.')
    }

    this.connecting = true
    this.updateStatus({ state: 'connecting', lastError: null })

    try {
      const { state, saveCreds } = await useMultiFileAuthState(this.authDir)
      const { version } = await fetchLatestBaileysVersion()

      this.socket?.ev.removeAllListeners('connection.update')
      this.socket?.ev.removeAllListeners('creds.update')
      this.socket?.ev.removeAllListeners('messages.upsert')

      const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: silentLogger,
        syncFullHistory: false,
        markOnlineOnConnect: false
      })

      this.socket = sock

      sock.ev.on('creds.update', saveCreds)

      sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update

        if (qr) {
          const qrDataUrl = await QRCode.toDataURL(qr)
          this.updateStatus({ state: 'qr', qrDataUrl, lastError: null })
        }

        if (connection === 'open') {
          const phone = sock.user?.id ? jidToPhone(sock.user.id) : null
          this.updateStatus({
            state: 'ready',
            phone,
            qrDataUrl: null,
            lastError: null,
            connectedAt: new Date().toISOString()
          })
          this.connecting = false
        }

        if (connection === 'close') {
          this.connecting = false
          if (this.intentionalDisconnect) {
            return
          }

          const statusCode = (lastDisconnect?.error as Boom | undefined)?.output?.statusCode
          const loggedOut = statusCode === DisconnectReason.loggedOut

          if (loggedOut && !this.hasSavedSession()) {
            this.updateStatus({
              state: 'disconnected',
              phone: null,
              qrDataUrl: null,
              lastError: null,
              connectedAt: null
            })
            return
          }

          this.updateStatus({
            state: loggedOut ? 'disconnected' : 'error',
            phone: null,
            qrDataUrl: null,
            lastError: loggedOut ? 'Previous WhatsApp session ended.' : 'Connection closed.',
            connectedAt: null
          })

          if (this.autoReconnectEnabled && !loggedOut && statusCode !== DisconnectReason.loggedOut) {
            setTimeout(() => {
              void this.connect().catch((error) => {
                logger.warn('WhatsApp reconnect failed', error)
              })
            }, 3000)
          }
        }
      })

      sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return

        for (const message of messages) {
          if (message.key.fromMe || !message.message) continue

          const remoteJid = message.key.remoteJid ?? ''
          if (
            !remoteJid ||
            isJidGroup(remoteJid) ||
            isJidBroadcast(remoteJid) ||
            isJidNewsletter(remoteJid) ||
            isJidStatusBroadcast(remoteJid) ||
            isJidMetaAI(remoteJid) ||
            isJidBot(remoteJid)
          ) {
            continue
          }

          const phone = resolveInboundPhone(message.key)
          if (!phone) continue

          const body = extractMessageBody(message.message)
          if (!body.trim()) continue

          this.trackUnreadMessage(message.key)

          try {
            await this.onInbound({
              phone,
              body: body.trim(),
              waMessageId: message.key.id ?? null,
              remoteJid,
              isQuotedReply: hasQuotedContext(message.message),
              isBusinessAccount: Boolean(message.verifiedBizName?.trim())
            })
          } catch (error) {
            logger.error('Inbound WhatsApp handler failed', error)
          }
        }
      })
    } catch (error) {
      this.connecting = false
      const message = error instanceof Error ? error.message : 'Failed to connect WhatsApp.'
      this.updateStatus({ state: 'error', lastError: message })
      throw error
    }
  }

  async disconnect(): Promise<void> {
    this.autoReconnectEnabled = false
    this.connecting = false
    this.intentionalDisconnect = true

    const socket = this.socket
    this.socket = null

    if (socket) {
      socket.ev.removeAllListeners('connection.update')
      socket.ev.removeAllListeners('creds.update')
      socket.ev.removeAllListeners('messages.upsert')
      socket.end(undefined)
    }

    this.clearAuthState()
    this.unreadKeysByJid.clear()
    this.intentionalDisconnect = false

    this.updateStatus({
      state: 'disconnected',
      phone: null,
      qrDataUrl: null,
      lastError: null,
      connectedAt: null
    })
  }

  async readUnseenMessages(jid: string): Promise<void> {
    const sock = this.socket
    if (!sock || !jid) return

    const keys = this.collectUnreadKeys(jid)
    if (keys.length === 0) return

    try {
      await sock.readMessages(keys)
    } catch (error) {
      logger.warn('Failed to mark WhatsApp messages as read', error)
    } finally {
      this.clearUnreadKeys(jid)
    }
  }

  async sendText(
    phone: string,
    body: string,
    options?: { showTyping?: boolean; typingMs?: number; jid?: string }
  ): Promise<string> {
    const sock = this.requireSocket()
    const jid = options?.jid ?? toWhatsAppJid(phone)

    if (options?.showTyping) {
      await sock.sendPresenceUpdate('composing', jid)
      if (options.typingMs && options.typingMs > 0) {
        await sleep(options.typingMs)
      }
    }

    const result = await sock.sendMessage(jid, { text: body })
    await sock.sendPresenceUpdate('paused', jid).catch(() => undefined)
    return result?.key.id ?? ''
  }

  async sendDocument(
    phone: string,
    filePath: string,
    caption?: string,
    fileName?: string,
    options?: { showTyping?: boolean; typingMs?: number; jid?: string }
  ): Promise<string> {
    const sock = this.requireSocket()
    const jid = options?.jid ?? toWhatsAppJid(phone)

    if (options?.showTyping) {
      await sock.sendPresenceUpdate('composing', jid)
      if (options.typingMs && options.typingMs > 0) {
        await sleep(options.typingMs)
      }
    }

    const buffer = readFileSync(filePath)
    const result = await sock.sendMessage(jid, {
      document: buffer,
      mimetype: 'application/pdf',
      fileName: fileName ?? basename(filePath),
      caption: caption ?? undefined
    })
    await sock.sendPresenceUpdate('paused', jid).catch(() => undefined)
    return result?.key.id ?? ''
  }

  private requireSocket(): WASocket {
    if (!this.socket || this.status.state !== 'ready') {
      throw new Error('WhatsApp is not connected.')
    }
    return this.socket
  }

  private updateStatus(patch: Partial<WhatsAppSessionStatus>): void {
    this.status = { ...this.status, ...patch }
    this.onStatusChange?.(this.getStatus())
  }

  private trackUnreadMessage(key: WAMessageKey): void {
    for (const jid of this.jidsForUnread(key)) {
      const existing = this.unreadKeysByJid.get(jid) ?? []
      if (existing.some((entry) => entry.id === key.id && entry.remoteJid === key.remoteJid)) {
        continue
      }
      existing.push(key)
      this.unreadKeysByJid.set(jid, existing)
    }
  }

  private jidsForUnread(key: WAMessageKey): string[] {
    const jids = [key.remoteJid, key.remoteJidAlt].filter((jid): jid is string => Boolean(jid))
    return [...new Set(jids)]
  }

  private collectUnreadKeys(jid: string): WAMessageKey[] {
    const keys = this.unreadKeysByJid.get(jid) ?? []
    const altKeys = [...this.unreadKeysByJid.entries()]
      .filter(([entryJid]) => entryJid !== jid)
      .flatMap(([, entries]) => entries)
      .filter((key) => key.remoteJid === jid || key.remoteJidAlt === jid)

    const merged = [...keys, ...altKeys]
    const seen = new Set<string>()
    return merged.filter((key) => {
      const id = `${key.remoteJid ?? ''}:${key.id ?? ''}`
      if (!key.id || seen.has(id)) return false
      seen.add(id)
      return true
    })
  }

  private clearUnreadKeys(jid: string): void {
    for (const [entryJid, keys] of [...this.unreadKeysByJid.entries()]) {
      const remaining = keys.filter((key) => key.remoteJid !== jid && key.remoteJidAlt !== jid)
      if (remaining.length === 0) {
        this.unreadKeysByJid.delete(entryJid)
      } else {
        this.unreadKeysByJid.set(entryJid, remaining)
      }
    }
  }
}

function extractMessageBody(message: proto.IMessage): string {
  return (
    message.conversation ??
    message.extendedTextMessage?.text ??
    message.imageMessage?.caption ??
    message.documentMessage?.caption ??
    ''
  )
}

function hasQuotedContext(message: proto.IMessage): boolean {
  const contexts = [
    message.extendedTextMessage?.contextInfo,
    message.imageMessage?.contextInfo,
    message.documentMessage?.contextInfo,
    message.videoMessage?.contextInfo
  ]

  return contexts.some((context) => Boolean(context?.quotedMessage || context?.stanzaId))
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
