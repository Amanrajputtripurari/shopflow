import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Loader2, Plug, Unplug } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'
import type { WhatsAppSessionStatus } from '@shared/types/whatsapp'

const STATE_LABELS: Record<NonNullable<WhatsAppSessionStatus['state']>, string> = {
  disconnected: 'disconnected',
  connecting: 'connecting',
  qr: 'waiting for scan',
  ready: 'connected',
  error: 'error'
}

function canShowConnect(status: WhatsAppSessionStatus | null): boolean {
  if (!status) return true
  if (status.state === 'ready') return false
  if (status.state === 'connecting') return false
  if (status.state === 'qr') return false
  return true
}

function canDisconnect(status: WhatsAppSessionStatus | null): boolean {
  if (!status) return false
  if (status.state === 'ready' || status.state === 'connecting' || status.state === 'qr') return true
  if (status.state === 'error') return true
  return Boolean(status.hasSavedSession)
}

export function WhatsAppConnectionCard() {
  const { isAdmin } = useAuth()
  const [status, setStatus] = useState<WhatsAppSessionStatus | null>(null)

  useEffect(() => {
    void window.api.whatsapp.sessionStatus().then((result) => {
      if (result.ok) setStatus(result.data)
    })
    return window.api.whatsapp.onSessionChanged((next) => setStatus(next))
  }, [])

  const connectMutation = useMutation({
    mutationFn: async () => {
      const result = await window.api.whatsapp.connect()
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
    onSuccess: (data) => {
      setStatus(data)
      toast.success('WhatsApp connection started — scan QR if shown.')
    },
    onError: (error: Error) => toast.error(error.message)
  })

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const result = await window.api.whatsapp.disconnect()
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
    onSuccess: (data) => {
      setStatus(data)
      toast.success('WhatsApp session cleared', {
        description: 'Connect again and scan a new QR code to link a device.'
      })
    },
    onError: (error: Error) => toast.error(error.message)
  })

  const current = status
  const isConnected = current?.state === 'ready'
  const isRestoring = current?.state === 'connecting' && Boolean(current.reconnectAttempt)
  const showConnect = canShowConnect(current)
  const showDisconnect = isAdmin && canDisconnect(current)
  const connectLabel =
    current?.hasSavedSession && current.state !== 'ready' ? 'Connect saved session' : 'Connect new device'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">WhatsApp connection</CardTitle>
        <CardDescription>
          Link your business number via QR code. Disconnect removes the current session completely so you
          can scan a fresh QR on the next connect.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={isConnected ? 'default' : 'secondary'}>
            {current ? STATE_LABELS[current.state] : 'unknown'}
          </Badge>
          {current?.phone && <span className="text-sm text-muted-foreground">+{current.phone}</span>}
        </div>

        {isRestoring && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Checking saved WhatsApp session…
          </div>
        )}

        {current?.lastError && current.hasSavedSession && (
          <p className="text-sm text-destructive">{current.lastError}</p>
        )}

        {current?.state === 'disconnected' && !current.hasSavedSession && !current.qrDataUrl && (
          <p className="text-sm text-muted-foreground">
            No device linked. Click <strong>Connect new device</strong> and scan the QR code with WhatsApp → Linked
            devices.
          </p>
        )}

        {current?.qrDataUrl && (
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm text-muted-foreground">Scan with WhatsApp → Linked devices</p>
            <img src={current.qrDataUrl} alt="WhatsApp QR code" className="size-48 rounded-lg border" />
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {showConnect && (
            <Button disabled={connectMutation.isPending} onClick={() => void connectMutation.mutateAsync()}>
              {connectMutation.isPending ? <Loader2 className="animate-spin" /> : <Plug className="size-4" />}
              {connectLabel}
            </Button>
          )}
          {showDisconnect && (
            <Button
              variant="outline"
              disabled={disconnectMutation.isPending}
              onClick={() => void disconnectMutation.mutateAsync()}
            >
              {disconnectMutation.isPending ? <Loader2 className="animate-spin" /> : <Unplug className="size-4" />}
              Disconnect
            </Button>
          )}
        </div>

        {current?.connectedAt && (
          <p className="text-xs text-muted-foreground">Connected since {new Date(current.connectedAt).toLocaleString()}</p>
        )}
      </CardContent>
    </Card>
  )
}
