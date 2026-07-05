import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import {
  BarChart3,
  FileStack,
  LayoutDashboard,
  LogOut,
  Package,
  PanelLeftOpen,
  Receipt,
  Settings,
  ShoppingCart,
  Users,
  Wallet
} from 'lucide-react'

import { SidebarNavItem } from '@/components/layout/sidebar-nav-item'
import { sidebarIconButtonClass } from '@/components/layout/sidebar-styles'
import { Button } from '@/components/ui/button'
import { GlobalSearchProvider, GlobalSearchMobileTrigger, GlobalSearchTrigger } from '@/components/layout/global-search'
import { WhatsAppStatusButton } from '@/components/layout/whatsapp-status-button'
import { ThemeMenu } from '@/components/theme/theme-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'

const SIDEBAR_COLLAPSED_KEY = 'shopflow.sidebar.collapsed'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, enabled: true },
  { to: '/orders', label: 'Orders', icon: ShoppingCart, enabled: true },
  { to: '/products', label: 'Products', icon: Package, enabled: true },
  { to: '/customers', label: 'Customers', icon: Users, enabled: true },
  { to: '/expenses', label: 'Expenses', icon: Wallet, enabled: true },
  { to: '/reports', label: 'Reports', icon: BarChart3, enabled: true },
  { to: '/invoice-layouts', label: 'Invoice layouts', icon: FileStack, enabled: true },
  { to: '/settings', label: 'Settings', icon: Settings, enabled: true }
]

function readCollapsedPreference(): boolean {
  return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true'
}

export function AppShell() {
  const [collapsed, setCollapsed] = useState(readCollapsedPreference)
  const { logout, user } = useAuth()
  const location = useLocation()
  const mainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed))
  }, [collapsed])

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0)
  }, [location.pathname, location.search])

  const handleLogout = () => {
    void logout().then(() => {
      window.location.href = '#/login'
    })
  }

  return (
    <GlobalSearchProvider>
      <TooltipProvider delayDuration={150}>
        <div className="flex h-screen overflow-hidden bg-background">
        <aside
          className={cn(
            'flex h-full shrink-0 flex-col overflow-hidden border-r bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-in-out',
            collapsed ? 'w-[4.5rem]' : 'w-64'
          )}
        >
          <div
            className={cn(
              'flex shrink-0 items-center border-b border-sidebar-border',
              collapsed ? 'h-14 justify-center px-2' : 'h-16 px-4'
            )}
          >
            <div className={cn('flex min-w-0 items-center', collapsed ? 'justify-center' : 'gap-2')}>
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <Receipt className="size-5" strokeWidth={1.75} />
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">ShopFlow</p>
                  <p className="truncate text-xs text-muted-foreground">Phase 4</p>
                </div>
              )}
            </div>
          </div>

          <nav
            className={cn(
              'flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-y-contain py-3',
              collapsed ? 'items-center gap-2 px-2' : 'gap-0.5 px-3'
            )}
          >
            {navItems.map((item) => (
              <SidebarNavItem key={item.to} {...item} collapsed={collapsed} />
            ))}
          </nav>

          <div
            className={cn(
              'shrink-0 border-t border-sidebar-border p-2',
              collapsed ? 'flex justify-center' : 'px-3 pb-3'
            )}
          >
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={sidebarIconButtonClass()}
                    onClick={handleLogout}
                  >
                    <LogOut className="size-5" strokeWidth={1.75} />
                    <span className="sr-only">Logout</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={10}>
                  Logout {user?.displayName ? `(${user.displayName})` : ''}
                </TooltipContent>
              </Tooltip>
            ) : (
              <Button variant="outline" className="w-full" onClick={handleLogout}>
                <LogOut className="size-4" />
                  Logout
              </Button>
            )}
          </div>
        </aside>

        <div className="flex min-h-0 flex-1 flex-col">
          <header className="flex h-16 shrink-0 items-center justify-between border-b px-6">
            <div className="flex items-center gap-3">
              {collapsed && (
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Expand sidebar"
                  onClick={() => setCollapsed(false)}
                >
                  <PanelLeftOpen className="size-4" />
                </Button>
              )}
              <div>
                <h1 className="text-lg font-semibold">ShopFlow</h1>
                <p className="text-sm text-muted-foreground">Company management desktop app</p>
              </div>
            </div>
            <div className="flex flex-1 items-center justify-end gap-2">
              <GlobalSearchTrigger />
              <GlobalSearchMobileTrigger />
              <WhatsAppStatusButton />
              <ThemeMenu />
            </div>
          </header>
          <main ref={mainRef} className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </TooltipProvider>
    </GlobalSearchProvider>
  )
}
