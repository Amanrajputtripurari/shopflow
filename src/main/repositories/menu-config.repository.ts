import { CONFIG_SINGLETON_ID, DEFAULT_WHATSAPP_MENU } from '@shared/constants/database'
import { COLLECTIONS } from '@shared/constants/database'
import type { MenuConfig, MenuConfigDocument, MenuConfigInput } from '@shared/types/whatsapp'
import { BaseRepository } from './base.repository'

function toDto(document: MenuConfigDocument): MenuConfig {
  return {
    enabled: document.enabled,
    welcomeTemplate: document.welcomeTemplate,
    items: document.items,
    keywords: document.keywords
  }
}

export class MenuConfigRepository extends BaseRepository<MenuConfigDocument> {
  constructor() {
    super(COLLECTIONS.MENU_CONFIG)
  }

  async get(): Promise<MenuConfig> {
    const document = await this.findOne({ _id: CONFIG_SINGLETON_ID })
    if (document) return toDto(document)

    return {
      enabled: DEFAULT_WHATSAPP_MENU.enabled,
      welcomeTemplate: DEFAULT_WHATSAPP_MENU.welcomeTemplate,
      items: [...DEFAULT_WHATSAPP_MENU.items],
      keywords: { ...DEFAULT_WHATSAPP_MENU.keywords }
    }
  }

  async save(input: MenuConfigInput): Promise<MenuConfig> {
    const existing = await this.get()
    const document: MenuConfigDocument = {
      _id: CONFIG_SINGLETON_ID,
      enabled: input.enabled ?? existing.enabled,
      welcomeTemplate: input.welcomeTemplate ?? existing.welcomeTemplate,
      items: input.items ?? existing.items,
      keywords: input.keywords ?? existing.keywords,
      updatedAt: new Date()
    }
    await this.replaceOne({ _id: CONFIG_SINGLETON_ID }, document)
    return toDto(document)
  }
}

export const menuConfigRepository = new MenuConfigRepository()
