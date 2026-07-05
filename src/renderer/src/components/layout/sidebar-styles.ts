import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function sidebarIconButtonClass(
  isActive = false,
  enabled = true,
  size: 'sm' | 'md' = 'md'
) {
  return cn(
    buttonVariants({ variant: 'ghost', size: 'icon' }),
    size === 'sm' ? 'size-8' : 'size-10',
    'shrink-0 text-sidebar-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground',
    isActive &&
      'bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 hover:text-sidebar-primary-foreground',
    !enabled && 'cursor-not-allowed opacity-50 hover:bg-transparent'
  )
}

export function sidebarNavLinkClass(isActive = false, enabled = true, collapsed = false) {
  if (collapsed) {
    return sidebarIconButtonClass(isActive, enabled)
  }

  return cn(
    'group relative flex h-10 w-full items-center gap-3 rounded-lg px-3 transition-colors',
    enabled
      ? isActive
        ? 'bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90'
        : 'text-sidebar-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground'
      : 'cursor-not-allowed opacity-50'
  )
}
