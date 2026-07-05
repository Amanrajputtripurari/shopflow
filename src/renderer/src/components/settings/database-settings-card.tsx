import { useEffect, useState } from 'react'
import { Clock, Database, Download, FolderOpen, Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useDbStatus, useAppSettings } from '@/hooks/use-app-data'
import { useAuth } from '@/hooks/use-auth'
import { formatDateTime, formatDuration } from '@/lib/format'
import type { BackupSettings } from '@shared/types/backup'

type OperationKind = 'backup' | 'restore' | null

function useElapsedTimer(active: boolean) {
  const [elapsedMs, setElapsedMs] = useState(0)

  useEffect(() => {
    if (!active) {
      setElapsedMs(0)
      return
    }

    const startedAt = Date.now()
    setElapsedMs(0)
    const timer = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAt)
    }, 250)

    return () => window.clearInterval(timer)
  }, [active])

  return elapsedMs
}

export function DatabaseSettingsCard() {
  const { isAdmin, logout } = useAuth()
  const { settings } = useAppSettings()
  const { status, refresh } = useDbStatus(15000)
  const [mongodbUrl, setMongodbUrl] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [adminUsername, setAdminUsername] = useState('admin')
  const [adminDisplayName, setAdminDisplayName] = useState('Administrator')
  const [adminPassword, setAdminPassword] = useState('')
  const [testing, setTesting] = useState(false)
  const [savingUrl, setSavingUrl] = useState(false)
  const [backingUp, setBackingUp] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [pickingFolder, setPickingFolder] = useState(false)
  const [openingFolder, setOpeningFolder] = useState(false)
  const [testOk, setTestOk] = useState(false)
  const [backupSettings, setBackupSettings] = useState<BackupSettings | null>(null)
  const [activeOperation, setActiveOperation] = useState<OperationKind>(null)

  const elapsedMs = useElapsedTimer(Boolean(activeOperation))

  useEffect(() => {
    if (!isAdmin) return
    void window.api.database.getBackupSettings().then((result) => {
      if (result.ok) setBackupSettings(result.data)
    })
  }, [isAdmin])

  useEffect(() => {
    if (settings?.companyName) {
      setCompanyName(settings.companyName)
    }
  }, [settings?.companyName])

  if (!isAdmin) return null

  const refreshBackupSettings = async () => {
    const result = await window.api.database.getBackupSettings()
    if (result.ok) setBackupSettings(result.data)
  }

  const handleTest = async () => {
    const trimmed = mongodbUrl.trim()
    if (!trimmed) {
      toast.error('Enter a MongoDB connection URL first.')
      return
    }

    setTesting(true)
    setTestOk(false)
    const result = await window.api.database.testConnection(trimmed)
    setTesting(false)

    if (result.ok) {
      setTestOk(true)
      toast.success(`Connected to ${result.data.databaseName} (${result.data.latencyMs}ms)`)
    } else {
      toast.error(result.error)
    }
  }

  const handleSaveUrl = async () => {
    const trimmed = mongodbUrl.trim()
    if (!trimmed) {
      toast.error('Enter a MongoDB connection URL first.')
      return
    }
    if (!companyName.trim()) {
      toast.error('Company name is required.')
      return
    }
    if (!adminUsername.trim() || !adminPassword.trim() || !adminDisplayName.trim()) {
      toast.error('Admin username, display name and password are required.')
      return
    }

    setSavingUrl(true)
    const result = await window.api.database.changeConnectionUrl({
      mongodbUrl: trimmed,
      companyName: companyName.trim(),
      admin: {
        username: adminUsername.trim(),
        password: adminPassword,
        displayName: adminDisplayName.trim()
      }
    })
    setSavingUrl(false)

    if (result.ok) {
      toast.success('Database connected and admin account seeded. Please sign in again.', {
        description: `Connected to ${result.data.databaseName ?? 'database'} as ${adminUsername.trim()}`
      })
      setTestOk(false)
      setAdminPassword('')
      await logout()
      window.location.href = '#/login'
    } else {
      toast.error(result.error)
    }
  }

  const handlePickFolder = async () => {
    setPickingFolder(true)
    const result = await window.api.database.pickBackupFolder()
    setPickingFolder(false)

    if (result.ok) {
      setBackupSettings(result.data)
      if (result.data.backupFolderPath) {
        toast.success('Backup folder updated')
      }
    } else if (!result.error.toLowerCase().includes('cancelled')) {
      toast.error(result.error)
    }
  }

  const handleClearFolder = async () => {
    const result = await window.api.database.clearBackupFolder()
    if (result.ok) {
      setBackupSettings(result.data)
      toast.success('Default backup folder cleared')
    } else {
      toast.error(result.error)
    }
  }

  const handleOpenFolder = async () => {
    setOpeningFolder(true)
    const result = await window.api.database.openBackupFolder()
    setOpeningFolder(false)

    if (!result.ok) {
      toast.error(result.error)
    }
  }

  const handleBackup = async () => {
    if (!backupSettings?.backupFolderPath) {
      toast.message('Choose a backup folder first', {
        description: 'Set where ShopFlow should save backup folders on this device.'
      })
      return
    }

    setBackingUp(true)
    setActiveOperation('backup')
    const result = await window.api.database.backup()
    setBackingUp(false)
    setActiveOperation(null)

    if (result.ok) {
      await refreshBackupSettings()
      toast.success('Backup completed', {
        description: `${result.data.documentCount} documents · ${result.data.collectionCount} collections · ${formatDuration(result.data.durationMs)} · saved to ${result.data.folderPath}`
      })
    } else if (!result.error.toLowerCase().includes('cancelled')) {
      toast.error(result.error)
    }
  }

  const handleRestore = async () => {
    setRestoring(true)
    setActiveOperation('restore')
    const result = await window.api.database.restore()
    setRestoring(false)
    setActiveOperation(null)

    if (result.ok) {
      await refreshBackupSettings()
      toast.success('Restore completed', {
        description: `${result.data.documentCount} documents restored in ${formatDuration(result.data.durationMs)}`
      })
      void refresh()
      window.location.reload()
    } else if (!result.error.toLowerCase().includes('cancelled')) {
      toast.error(result.error)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Database</CardTitle>
        <CardDescription>
          MongoDB connection, backup and restore. All operations run securely in the Electron main
          process on Windows, macOS and Linux.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Status</span>
          <Badge variant={status?.connected ? 'default' : 'destructive'}>
            {status?.connected ? 'Connected' : 'Disconnected'}
          </Badge>
        </div>

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-4 sm:block">
            <dt className="text-muted-foreground">Database</dt>
            <dd className="font-medium">{status?.databaseName ?? '—'}</dd>
          </div>
          <div className="flex justify-between gap-4 sm:block">
            <dt className="text-muted-foreground">Latency</dt>
            <dd className="font-medium tabular-nums">
              {status?.latencyMs != null ? `${status.latencyMs} ms` : '—'}
            </dd>
          </div>
          <div className="flex justify-between gap-4 sm:col-span-2 sm:block">
            <dt className="text-muted-foreground">Last checked</dt>
            <dd className="font-medium">{status?.lastCheckedAt ? formatDateTime(status.lastCheckedAt) : '—'}</dd>
          </div>
        </dl>

        {status?.error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {status.error}
          </p>
        )}

        <Button variant="outline" size="sm" onClick={() => void refresh()}>
          Refresh status
        </Button>

        <Separator />

        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-medium">Change connection URL</h4>
            <p className="text-sm text-muted-foreground">
              Connect to a new MongoDB database, run migrations, seed admin user and mark setup
              complete. You will be signed out and must log in with the new admin credentials.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-mongodb-url">MongoDB connection URL</Label>
            <Input
              id="settings-mongodb-url"
              placeholder="mongodb://localhost:27017/shopflow"
              value={mongodbUrl}
              onChange={(event) => {
                setMongodbUrl(event.target.value)
                setTestOk(false)
              }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={testing} onClick={() => void handleTest()}>
              {testing && <Loader2 className="animate-spin" />}
              Test connection
            </Button>
          </div>

          {testOk && (
            <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
              <div className="space-y-2">
                <Label htmlFor="settings-company-name">Company name</Label>
                <Input
                  id="settings-company-name"
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  placeholder="My Shop"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="settings-admin-username">Admin username</Label>
                  <Input
                    id="settings-admin-username"
                    value={adminUsername}
                    onChange={(event) => setAdminUsername(event.target.value)}
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-admin-display-name">Admin display name</Label>
                  <Input
                    id="settings-admin-display-name"
                    value={adminDisplayName}
                    onChange={(event) => setAdminDisplayName(event.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-admin-password">Admin password</Label>
                <Input
                  id="settings-admin-password"
                  type="password"
                  value={adminPassword}
                  onChange={(event) => setAdminPassword(event.target.value)}
                  autoComplete="new-password"
                  placeholder="Set password for this database"
                />
              </div>
              <Button type="button" disabled={savingUrl} onClick={() => void handleSaveUrl()}>
                {savingUrl && <Loader2 className="animate-spin" />}
                Save, seed admin & reconnect
              </Button>
            </div>
          )}
        </div>

        <Separator />

        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium">Backup folder</h4>
            <p className="text-sm text-muted-foreground">
              Choose once where backups are saved. Each backup creates a new dated subfolder inside
              this path.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="backup-folder-path">Default backup location</Label>
            <Input
              id="backup-folder-path"
              readOnly
              value={backupSettings?.backupFolderPath ?? ''}
              placeholder="No folder selected — click Change folder"
              className="font-mono text-xs"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={pickingFolder} onClick={() => void handlePickFolder()}>
              {pickingFolder ? <Loader2 className="animate-spin" /> : <FolderOpen className="size-4" />}
              Change folder
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={openingFolder || !backupSettings?.backupFolderPath}
              onClick={() => void handleOpenFolder()}
            >
              {openingFolder ? <Loader2 className="animate-spin" /> : <FolderOpen className="size-4" />}
              Open folder
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={!backupSettings?.backupFolderPath}
              onClick={() => void handleClearFolder()}
            >
              Clear
            </Button>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium">Backup & restore</h4>
            <p className="text-sm text-muted-foreground">
              Export all MongoDB collections or restore from a previous ShopFlow backup folder.
              PDF bills are not included in backups.
            </p>
          </div>

          {activeOperation && (
            <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
              <Loader2 className="size-4 animate-spin text-primary" />
              <div>
                <p className="text-sm font-medium">
                  {activeOperation === 'backup' ? 'Creating backup…' : 'Restoring backup…'}
                </p>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="size-3.5" />
                  Elapsed: {formatDuration(elapsedMs)}
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={backingUp || !status?.connected || !backupSettings?.backupFolderPath}
              onClick={() => void handleBackup()}
            >
              {backingUp ? <Loader2 className="animate-spin" /> : <Download className="size-4" />}
              Start backup
            </Button>
            <Button type="button" variant="outline" disabled={restoring} onClick={() => void handleRestore()}>
              {restoring ? <Loader2 className="animate-spin" /> : <Upload className="size-4" />}
              Restore from folder
            </Button>
          </div>

          {!backupSettings?.backupFolderPath && (
            <p className="text-xs text-muted-foreground">
              Set a backup folder before starting your first backup.
            </p>
          )}

          {!status?.connected && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Database className="size-3.5" />
              Connect to MongoDB before creating a backup.
            </p>
          )}

          {(backupSettings?.lastBackup || backupSettings?.lastRestore) && (
            <div className="grid gap-3 rounded-lg border bg-muted/20 p-4 sm:grid-cols-2">
              {backupSettings.lastBackup && (
                <div className="space-y-1 text-sm">
                  <p className="font-medium">Last backup</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(backupSettings.lastBackup.at)} ·{' '}
                    {formatDuration(backupSettings.lastBackup.durationMs)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {backupSettings.lastBackup.documentCount} docs ·{' '}
                    {backupSettings.lastBackup.collectionCount} collections
                  </p>
                  <p className="truncate font-mono text-[10px] text-muted-foreground">
                    {backupSettings.lastBackup.folderPath}
                  </p>
                </div>
              )}
              {backupSettings.lastRestore && (
                <div className="space-y-1 text-sm">
                  <p className="font-medium">Last restore</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(backupSettings.lastRestore.at)} ·{' '}
                    {formatDuration(backupSettings.lastRestore.durationMs)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {backupSettings.lastRestore.documentCount} docs restored
                  </p>
                  <p className="truncate font-mono text-[10px] text-muted-foreground">
                    {backupSettings.lastRestore.folderPath}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
