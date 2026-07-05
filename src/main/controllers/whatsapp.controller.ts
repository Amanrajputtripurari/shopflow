import { ipcMain } from 'electron'

import { IPC_CHANNELS } from '@shared/ipc-channels'
import type {
  AntiBanConfigInput,
  ApproveQueueInput,
  AssignConversationInput,
  MenuConfigInput,
  QueueDeliveryListInput,
  WhatsAppMessagingConfigInput,
  ReplyInput,
  SendBillInput,
  SendTemplateInput
} from '@shared/types/whatsapp'
import { adminHandler, secureHandler, success } from '../helpers/secure-ipc'
import { whatsappService } from '../services/whatsapp.service'

export function registerWhatsAppController(): void {
  ipcMain.handle(
    IPC_CHANNELS.WHATSAPP_SESSION_STATUS,
    secureHandler(IPC_CHANNELS.WHATSAPP_SESSION_STATUS, async () => {
      return success(await whatsappService.getSessionStatus())
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.WHATSAPP_CONNECT,
    secureHandler(IPC_CHANNELS.WHATSAPP_CONNECT, async (user) => {
      return success(await whatsappService.connect(user))
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.WHATSAPP_DISCONNECT,
    adminHandler(IPC_CHANNELS.WHATSAPP_DISCONNECT, async (user) => {
      return success(await whatsappService.disconnect(user))
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.WHATSAPP_MENU_GET,
    secureHandler(IPC_CHANNELS.WHATSAPP_MENU_GET, async () => {
      return success(await whatsappService.getMenuConfig())
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.WHATSAPP_MENU_SAVE,
    adminHandler(IPC_CHANNELS.WHATSAPP_MENU_SAVE, async (user, input: MenuConfigInput) => {
      return success(await whatsappService.saveMenuConfig(user, input))
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.WHATSAPP_ANTIBAN_GET,
    secureHandler(IPC_CHANNELS.WHATSAPP_ANTIBAN_GET, async () => {
      return success(await whatsappService.getAntiBanConfig())
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.WHATSAPP_ANTIBAN_SAVE,
    adminHandler(IPC_CHANNELS.WHATSAPP_ANTIBAN_SAVE, async (user, input: AntiBanConfigInput) => {
      return success(await whatsappService.saveAntiBanConfig(user, input))
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.WHATSAPP_MESSAGING_GET,
    secureHandler(IPC_CHANNELS.WHATSAPP_MESSAGING_GET, async () => {
      return success(await whatsappService.getMessagingConfig())
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.WHATSAPP_MESSAGING_SAVE,
    adminHandler(IPC_CHANNELS.WHATSAPP_MESSAGING_SAVE, async (user, input: WhatsAppMessagingConfigInput) => {
      return success(await whatsappService.saveMessagingConfig(user, input))
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.WHATSAPP_INBOX_LIST,
    secureHandler(IPC_CHANNELS.WHATSAPP_INBOX_LIST, async (user) => {
      return success(await whatsappService.listInbox(user))
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.WHATSAPP_MESSAGES_LIST,
    secureHandler(IPC_CHANNELS.WHATSAPP_MESSAGES_LIST, async (_user, conversationId: string) => {
      return success(await whatsappService.listMessages(conversationId))
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.WHATSAPP_ASSIGN,
    secureHandler(IPC_CHANNELS.WHATSAPP_ASSIGN, async (user, input: AssignConversationInput) => {
      return success(await whatsappService.assignConversation(user, input))
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.WHATSAPP_REPLY,
    secureHandler(IPC_CHANNELS.WHATSAPP_REPLY, async (user, input: ReplyInput) => {
      await whatsappService.reply(user, input)
      return success(null)
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.WHATSAPP_SEND_BILL,
    secureHandler(IPC_CHANNELS.WHATSAPP_SEND_BILL, async (user, input: SendBillInput) => {
      return success(await whatsappService.sendBill(user, input))
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.WHATSAPP_SEND_TEMPLATE,
    secureHandler(IPC_CHANNELS.WHATSAPP_SEND_TEMPLATE, async (user, input: SendTemplateInput) => {
      return success(await whatsappService.sendTemplate(user, input))
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.WHATSAPP_QUEUE_LIST,
    adminHandler(IPC_CHANNELS.WHATSAPP_QUEUE_LIST, async (user) => {
      return success(await whatsappService.listPendingQueue(user))
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.WHATSAPP_QUEUE_DELIVERY_LIST,
    secureHandler(IPC_CHANNELS.WHATSAPP_QUEUE_DELIVERY_LIST, async (user, input?: QueueDeliveryListInput) => {
      return success(await whatsappService.listDeliveryQueue(user, input))
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.WHATSAPP_QUEUE_APPROVE,
    adminHandler(IPC_CHANNELS.WHATSAPP_QUEUE_APPROVE, async (user, input: ApproveQueueInput) => {
      return success(await whatsappService.approveQueue(user, input))
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.WHATSAPP_QUEUE_RETRY,
    adminHandler(IPC_CHANNELS.WHATSAPP_QUEUE_RETRY, async (user, queueId: string) => {
      return success(await whatsappService.retryQueue(user, queueId))
    })
  )

  ipcMain.handle(
    IPC_CHANNELS.WHATSAPP_LOGS_LIST,
    secureHandler(IPC_CHANNELS.WHATSAPP_LOGS_LIST, async () => {
      return success(await whatsappService.listLogs())
    })
  )
}
