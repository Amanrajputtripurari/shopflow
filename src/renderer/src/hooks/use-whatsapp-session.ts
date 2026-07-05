import { useEffect, useState } from 'react'

import type { WhatsAppSessionStatus } from '@shared/types/whatsapp'

export function useWhatsAppSession() {
  const [status, setStatus] = useState<WhatsAppSessionStatus | null>(null)

  useEffect(() => {
    void window.api.whatsapp.sessionStatus().then((result) => {
      if (result.ok) setStatus(result.data)
    })
    return window.api.whatsapp.onSessionChanged((next) => setStatus(next))
  }, [])

  const isConnected = status?.state === 'ready'

  return { status, isConnected }
}
