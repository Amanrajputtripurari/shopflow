import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Database, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function SetupPage() {
  const navigate = useNavigate()
  const [companyName, setCompanyName] = useState('')
  const [mongodbUrl, setMongodbUrl] = useState('mongodb://localhost:27017/shopflow')
  const [adminUsername, setAdminUsername] = useState('admin')
  const [adminDisplayName, setAdminDisplayName] = useState('Administrator')
  const [adminPassword, setAdminPassword] = useState('')
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testOk, setTestOk] = useState(false)

  const handleTest = async () => {
    setTesting(true)
    setTestOk(false)
    const result = await window.api.database.testConnection(mongodbUrl.trim())
    setTesting(false)

    if (result.ok) {
      setTestOk(true)
      toast.success(`Connected to ${result.data.databaseName} (${result.data.latencyMs}ms)`)
    } else {
      toast.error(result.error)
    }
  }

  const handleComplete = async () => {
    if (!companyName.trim()) {
      toast.error('Company name is required.')
      return
    }
    if (!adminUsername.trim() || !adminPassword.trim() || !adminDisplayName.trim()) {
      toast.error('Admin username, display name and password are required.')
      return
    }

    setSaving(true)
    const result = await window.api.setup.complete({
      mongodbUrl: mongodbUrl.trim(),
      companyName: companyName.trim(),
      admin: {
        username: adminUsername.trim(),
        password: adminPassword,
        displayName: adminDisplayName.trim()
      }
    })
    setSaving(false)

    if (result.ok) {
      toast.success('Setup complete. Sign in with your admin account.')
      navigate('/login')
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Database className="h-5 w-5" />
          </div>
          <CardTitle>Welcome to ShopFlow</CardTitle>
          <CardDescription>
            Connect MongoDB, set your company name and create the first admin account. The
            connection URL is stored securely in the Electron main process only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Company name</Label>
            <Input
              id="companyName"
              placeholder="My Shop"
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mongodbUrl">MongoDB connection URL</Label>
            <Input
              id="mongodbUrl"
              placeholder="mongodb://localhost:27017/shopflow"
              value={mongodbUrl}
              onChange={(event) => {
                setMongodbUrl(event.target.value)
                setTestOk(false)
              }}
            />
            <p className="text-xs text-muted-foreground">
              Example Atlas: mongodb+srv://user:pass@cluster.mongodb.net/shopflow
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="adminUsername">Admin username</Label>
              <Input
                id="adminUsername"
                value={adminUsername}
                onChange={(event) => setAdminUsername(event.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminDisplayName">Admin display name</Label>
              <Input
                id="adminDisplayName"
                value={adminDisplayName}
                onChange={(event) => setAdminDisplayName(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="adminPassword">Admin password</Label>
            <Input
              id="adminPassword"
              type="password"
              value={adminPassword}
              onChange={(event) => setAdminPassword(event.target.value)}
              autoComplete="new-password"
              placeholder="Choose a secure password"
            />
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => void handleTest()} disabled={testing}>
              {testing && <Loader2 className="animate-spin" />}
              Test connection
            </Button>
            <Button
              type="button"
              onClick={() => void handleComplete()}
              disabled={saving || !testOk}
            >
              {saving && <Loader2 className="animate-spin" />}
              Save & continue
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
