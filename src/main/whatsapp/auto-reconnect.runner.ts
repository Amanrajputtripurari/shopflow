import type { WhatsAppSessionStatus } from '@shared/types/whatsapp'

import { logger } from '../helpers/logger'
import type { BaileysClient } from './baileys-client'

/** One startup restore attempt — fail fast instead of retrying timeouts. */
export const AUTO_RECONNECT_MAX_ATTEMPTS = 1
export const AUTO_RECONNECT_TIMEOUT_MS = 20_000

export type AutoReconnectResult = 'ready' | 'failed' | 'skipped'
export type ConnectionOutcome = 'ready' | 'qr' | 'error' | 'timeout'

export async function runWhatsAppAutoReconnect(
  client: BaileysClient,
  onProgress: (patch: Partial<WhatsAppSessionStatus>) => void
): Promise<AutoReconnectResult> {
  if (!client.hasSavedSession()) {
    onProgress({ hasSavedSession: false, reconnectAttempt: null, autoReconnectFailed: false })
    return 'skipped'
  }

  client.setAutoReconnect(false)

  onProgress({
    hasSavedSession: true,
    autoReconnectFailed: false,
    reconnectAttempt: 1,
    lastError: null,
    state: 'connecting',
    qrDataUrl: null
  })

  let outcome: ConnectionOutcome = 'error'

  try {
    const outcomePromise = client.waitForConnectionOutcome(AUTO_RECONNECT_TIMEOUT_MS)
    await client.connect()
    outcome = await outcomePromise

    if (outcome === 'ready') {
      client.setAutoReconnect(true)
      onProgress({ reconnectAttempt: null, autoReconnectFailed: false })
      return 'ready'
    }
  } catch (error) {
    outcome = 'error'
    logger.warn('WhatsApp auto-reconnect errored', error)
  }

  await client.closeWithoutLogout()
  client.clearAuthState()
  client.setAutoReconnect(false)

  logger.info('WhatsApp saved session cleared after failed restore', { outcome })

  onProgress({
    state: 'disconnected',
    phone: null,
    qrDataUrl: null,
    connectedAt: null,
    reconnectAttempt: null,
    autoReconnectFailed: false,
    hasSavedSession: false,
    lastError: null
  })

  return 'failed'
}
