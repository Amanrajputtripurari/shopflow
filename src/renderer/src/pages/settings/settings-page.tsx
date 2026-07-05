import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Building2,
  MessageCircle,
  Monitor,
  Server,
  Tags,
  Users
} from 'lucide-react'

import { CompanySettingsCard } from '@/components/settings/company-settings-card'
import { DatabaseSettingsCard } from '@/components/settings/database-settings-card'
import { ExpenseCategoriesSettingsCard } from '@/components/settings/expense-categories-settings-card'
import { WhatsAppSettingsPanel } from '@/components/settings/whatsapp-settings-panel'
import { UsersSettingsCard } from '@/components/settings/users-settings-card'
import { AppearanceSettings } from '@/components/theme/appearance-settings'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/hooks/use-auth'
import { useAppSettings } from '@/hooks/use-app-data'

const ADMIN_TABS = ['business', 'whatsapp', 'expenses', 'team', 'appearance', 'system'] as const
const STAFF_TABS = ['whatsapp', 'appearance', 'system'] as const

export function SettingsPage() {
  const { isAdmin } = useAuth()
  const { settings, refresh } = useAppSettings()
  const [searchParams, setSearchParams] = useSearchParams()
  const [appVersion, setAppVersion] = useState<string>('…')

  const activeTab = useMemo(() => {
    const requested = searchParams.get('tab')
    const allowed: readonly string[] = isAdmin ? ADMIN_TABS : STAFF_TABS
    if (requested && allowed.includes(requested)) {
      return requested
    }
    return isAdmin ? 'business' : 'whatsapp'
  }, [isAdmin, searchParams])

  useEffect(() => {
    void window.api.app.getVersion().then((result) => {
      if (result.ok) setAppVersion(result.data)
    })
  }, [])

  return (
    <div className="space-y-6 pb-2">
      <PageHeader
        title="Settings"
        description="Manage company profile, WhatsApp, appearance, and system preferences."
      />

      <Tabs
        value={activeTab}
        onValueChange={(tab) => setSearchParams({ tab })}
        className="w-full"
      >
        <TabsList>
          {isAdmin && (
            <TabsTrigger value="business" className="gap-2">
              <Building2 className="size-4" />
              Business
            </TabsTrigger>
          )}
          <TabsTrigger value="whatsapp" className="gap-2">
            <MessageCircle className="size-4" />
            WhatsApp
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="expenses" className="gap-2">
              <Tags className="size-4" />
              Expenses
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="team" className="gap-2">
              <Users className="size-4" />
              Team
            </TabsTrigger>
          )}
          <TabsTrigger value="appearance" className="gap-2">
            <Monitor className="size-4" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-2">
            <Server className="size-4" />
            System
          </TabsTrigger>
        </TabsList>

        {isAdmin && (
          <TabsContent value="business" className="space-y-6">
            <CompanySettingsCard />
          </TabsContent>
        )}

        <TabsContent value="whatsapp" className="space-y-6">
          <WhatsAppSettingsPanel />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="expenses" className="space-y-6">
            <ExpenseCategoriesSettingsCard />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="team" className="space-y-6">
            <UsersSettingsCard />
          </TabsContent>
        )}

        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Theme & colors</CardTitle>
              <CardDescription>
                Light or dark mode and accent color — saved to your database profile.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AppearanceSettings settings={settings} onRefresh={refresh} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <DatabaseSettingsCard />
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">About ShopFlow</CardTitle>
                <CardDescription>Application info and diagnostics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Version</Label>
                  <p className="text-lg font-semibold tabular-nums">{appVersion}</p>
                </div>
                <Separator />
                <p className="text-sm text-muted-foreground">
                  Desktop business management for orders, billing, expenses, and WhatsApp.
                </p>
                <Button variant="outline" size="sm" onClick={() => void window.api.app.openLogs()}>
                  Open log folder
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
