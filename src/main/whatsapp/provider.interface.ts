export interface WhatsAppProvider {
  connect(): Promise<void>
  disconnect(): Promise<void>
  getStatus(): import('@shared/types/whatsapp').WhatsAppSessionStatus
  sendText(
    phone: string,
    body: string,
    options?: { showTyping?: boolean; typingMs?: number; jid?: string }
  ): Promise<string>
  sendDocument(
    phone: string,
    filePath: string,
    caption?: string,
    fileName?: string,
    options?: { showTyping?: boolean; typingMs?: number; jid?: string }
  ): Promise<string>
  readUnseenMessages(jid: string): Promise<void>
}
