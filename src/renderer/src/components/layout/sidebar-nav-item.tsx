import type { LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { sidebarNavLinkClass } from '@/components/layout/sidebar-styles'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface SidebarNavItemProps {
  to: string
  label: string
  icon: LucideIcon
  enabled: boolean
  collapsed: boolean
}

export function SidebarNavItem({ to, label, icon: Icon, enabled, collapsed }: SidebarNavItemProps) {
  const link = (
    <NavLink
      to={enabled ? to : '#'}
      onClick={(event) => {
        if (!enabled) event.preventDefault()
      }}
      className={({ isActive }) => sidebarNavLinkClass(isActive, enabled, collapsed)}
    >
      <Icon className="size-5 shrink-0" strokeWidth={1.75} />
      {!collapsed && (
        <>
          <span className="flex-1 truncate text-sm">{label}</span>
          {!enabled && (
            <Badge variant="secondary" className="shrink-0 text-[10px]">
              Soon
            </Badge>
          )}
        </>
      )}
    </NavLink>
  )

  if (!collapsed) {
    return link
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={10}>
        {label}
        {!enabled && ' (Soon)'}
      </TooltipContent>
    </Tooltip>
  )
}
