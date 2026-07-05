import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, LogIn } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/use-auth'

export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    const result = await window.api.auth.login({ username, password })
    setLoading(false)

    if (result.ok) {
      login(result.data.token, result.data.user)
      toast.success(`Welcome, ${result.data.user.displayName}`)
      navigate('/dashboard')
      return
    }

    toast.error(result.error)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LogIn className="h-5 w-5" />
          </div>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            Default admin: username <strong>admin</strong>, password <strong>admin</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void handleSubmit()
              }}
            />
          </div>
          <Button className="w-full" disabled={loading} onClick={() => void handleSubmit()}>
            {loading && <Loader2 className="animate-spin" />}
            Sign in
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
