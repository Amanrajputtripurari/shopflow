import type { AntiBanConfig } from '@shared/types/whatsapp'

interface SendRecord {
  at: number
  phone: string
  success: boolean
}

export class RateLimiter {
  private sends: SendRecord[] = []
  private lastByPhone = new Map<string, number>()

  constructor(private config: AntiBanConfig) {}

  updateConfig(config: AntiBanConfig): void {
    this.config = config
  }

  isOutboundPaused(): boolean {
    return this.config.outboundPaused
  }

  canSend(phone: string, options?: { bypassCustomerGap?: boolean }): { allowed: boolean; reason?: string } {
    const now = Date.now()
    this.prune(now)

    const lastMinute = this.sends.filter((entry) => now - entry.at < 60_000).length
    if (lastMinute >= this.config.maxPerMinute) {
      return { allowed: false, reason: 'Per-minute send limit reached. Try again shortly.' }
    }

    const lastHour = this.sends.length
    if (lastHour >= this.config.maxPerHour) {
      return { allowed: false, reason: 'Hourly send limit reached.' }
    }

    if (!options?.bypassCustomerGap) {
      const lastSame = this.lastByPhone.get(phone)
      if (lastSame && now - lastSame < this.config.minGapSameCustomerMs) {
        return { allowed: false, reason: 'Please wait before messaging this customer again.' }
      }
    }

    const recent = this.sends.slice(-20)
    if (recent.length >= 10) {
      const failures = recent.filter((entry) => !entry.success).length
      const rate = failures / recent.length
      if (rate >= this.config.pauseOnFailureRate) {
        return { allowed: false, reason: 'Too many recent failures — outbound paused temporarily.' }
      }
    }

    return { allowed: true }
  }

  recordSend(phone: string, success: boolean): void {
    const now = Date.now()
    this.sends.push({ at: now, phone, success })
    if (success) {
      this.lastByPhone.set(phone, now)
    }
    this.prune(now)
  }

  private prune(now: number): void {
    this.sends = this.sends.filter((entry) => now - entry.at < 3_600_000)
  }
}
