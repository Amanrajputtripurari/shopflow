import { useNavigate } from 'react-router-dom'

import { WhatsAppIcon } from '@/components/icons/whatsapp-icon'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useWhatsAppSession } from '@/hooks/use-whatsapp-session'
import { cn } from '@/lib/utils'

function getTooltipLabel(isConnected: boolean, phone: string | null | undefined): string {
  if (isConnected) {
    return phone ? `WhatsApp connected (+${phone})` : 'WhatsApp connected'
  }
  return 'WhatsApp not connected — open settings'
}

export function WhatsAppStatusButton() {
  const navigate = useNavigate()
  const { status, isConnected } = useWhatsAppSession()

  const tooltip = getTooltipLabel(isConnected, status?.phone)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label={tooltip}
          onClick={() => navigate('/settings?tab=whatsapp')}
        >
          <WhatsAppIcon
            className={cn(
              'size-[18px] transition-colors',
              isConnected ? 'text-green-500' : 'text-muted-foreground'
            )}
          />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{tooltip}</TooltipContent>
    </Tooltip>
  )
}
