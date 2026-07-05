import {
  isHostedPnUser,
  isLidUser,
  isPnUser,
  type WAMessageKey
} from '@whiskeysockets/baileys'

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `91${digits}`
  if (digits.startsWith('0') && digits.length === 11) return `91${digits.slice(1)}`
  return digits
}

export function toWhatsAppJid(phone: string): string {
  return `${normalizePhone(phone)}@s.whatsapp.net`
}

export function jidToPhone(jid: string): string {
  return jid.split('@')[0]?.replace(/\D/g, '') ?? ''
}

export function isValidPhone(phone: string): boolean {
  const normalized = normalizePhone(phone)
  return normalized.length >= 10 && normalized.length <= 15
}

/** Prefer real phone JID over LID when WhatsApp sends both. */
export function resolveInboundPhone(key: WAMessageKey): string {
  const candidates = [key.remoteJidAlt, key.remoteJid, key.participantAlt, key.participant].filter(
    (jid): jid is string => Boolean(jid)
  )

  for (const jid of candidates) {
    if (isPnUser(jid) || isHostedPnUser(jid)) {
      const phone = jidToPhone(jid)
      if (isValidPhone(phone)) return normalizePhone(phone)
    }
  }

  for (const jid of candidates) {
    if (isLidUser(jid)) {
      const phone = jidToPhone(jid)
      if (phone) return normalizePhone(phone)
    }
  }

  return jidToPhone(key.remoteJid ?? '')
}

export function isVerifiedBusinessMessage(message: { verifiedBizName?: string | null }): boolean {
  return Boolean(message.verifiedBizName?.trim())
}
