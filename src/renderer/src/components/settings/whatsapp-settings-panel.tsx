import {
  FileText,
  LayoutList,
  Plug,
  SendHorizontal,
  Settings2,
  type LucideIcon
} from 'lucide-react'

import { WhatsAppAntiBanSettingsCard } from '@/components/settings/whatsapp-antiban-settings-card'
import { WhatsAppConnectionCard } from '@/components/settings/whatsapp-connection-card'
import { WhatsAppDeliveryQueueCard } from '@/components/settings/whatsapp-delivery-queue-card'
import { WhatsAppMenuSettingsCard } from '@/components/settings/whatsapp-menu-settings-card'
import { WhatsAppMessagingSettingsCard } from '@/components/settings/whatsapp-messaging-settings-card'
import { WhatsAppQueueSettingsCard } from '@/components/settings/whatsapp-queue-settings-card'
import { WhatsAppSystemTemplatesCard } from '@/components/settings/whatsapp-system-templates-card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'

type WhatsAppSectionId = 'connections' | 'delivery' | 'templates' | 'menu' | 'settings'

interface WhatsAppNavItem {
  id: WhatsAppSectionId
  label: string
  icon: LucideIcon
}

const DELIVERY_NAV_ITEM: WhatsAppNavItem = {
  id: 'delivery',
  label: 'Delivery queue',
  icon: SendHorizontal
}

/** Main nav items — add new sections here; Settings stays last via SETTINGS_NAV_ITEM. */
const WHATSAPP_NAV_ITEMS: WhatsAppNavItem[] = [
  { id: 'connections', label: 'Connections', icon: Plug },
  DELIVERY_NAV_ITEM,
  { id: 'templates', label: 'System templates', icon: FileText },
  { id: 'menu', label: 'Menu', icon: LayoutList }
]

const SETTINGS_NAV_ITEM: WhatsAppNavItem = {
  id: 'settings',
  label: 'Settings',
  icon: Settings2
}

const STAFF_SECTIONS: WhatsAppNavItem[] = [
  { id: 'connections', label: 'Connections', icon: Plug },
  DELIVERY_NAV_ITEM
]

function buildAdminSections(): WhatsAppNavItem[] {
  return [...WHATSAPP_NAV_ITEMS, SETTINGS_NAV_ITEM]
}

export function WhatsAppSettingsPanel() {
  const { isAdmin } = useAuth()
  const sections = isAdmin ? buildAdminSections() : STAFF_SECTIONS

  return (
    <Tabs defaultValue="connections" orientation="vertical" className="flex w-full items-start gap-6">
      <TabsList
        className={cn(
          'h-fit w-full shrink-0 self-start p-1',
          'flex flex-row justify-start gap-1 overflow-x-auto',
          'md:w-56 md:flex-col md:items-stretch md:overflow-x-visible'
        )}
      >
        {sections.map((section) => {
          const Icon = section.icon
          return (
            <TabsTrigger
              key={section.id}
              value={section.id}
              className="justify-start gap-2 md:w-full"
            >
              <Icon className="size-4 shrink-0" />
              {section.label}
            </TabsTrigger>
          )
        })}
      </TabsList>

      <div className="min-w-0 flex-1">
        <TabsContent value="connections" className="mt-0">
          <WhatsAppConnectionCard />
        </TabsContent>

        <TabsContent value="delivery" className="mt-0">
          <WhatsAppDeliveryQueueCard />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="templates" className="mt-0">
            <WhatsAppSystemTemplatesCard />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="menu" className="mt-0">
            <WhatsAppMenuSettingsCard />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="settings" className="mt-0 space-y-6">
            <WhatsAppMessagingSettingsCard />
            <WhatsAppAntiBanSettingsCard />
            <WhatsAppQueueSettingsCard />
          </TabsContent>
        )}
      </div>
    </Tabs>
  )
}
