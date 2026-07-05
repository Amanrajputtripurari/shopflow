import {
  BarChart3,
  FileStack,
  LayoutDashboard,
  MessageCircle,
  Package,
  PlusCircle,
  Settings,
  ShoppingCart,
  Tags,
  Users,
  Wallet,
  type LucideIcon
} from 'lucide-react'

export interface GlobalSearchPageItem {
  id: string
  label: string
  description: string
  path: string
  keywords: string[]
  icon: LucideIcon
  shortcut?: string
}

export const GLOBAL_SEARCH_QUICK_ACTIONS: GlobalSearchPageItem[] = [
  {
    id: 'new-order',
    label: 'Create new order',
    description: 'Open quick order (POS)',
    path: '/orders/new',
    keywords: ['new order', 'create order', 'quick order', 'pos', 'bill', 'sale'],
    icon: PlusCircle,
    shortcut: 'N'
  }
]

export const GLOBAL_SEARCH_PAGES: GlobalSearchPageItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Overview, KPIs and charts',
    path: '/dashboard',
    keywords: ['dashboard', 'home', 'overview', 'stats', 'analytics', 'summary'],
    icon: LayoutDashboard
  },
  {
    id: 'orders',
    label: 'Orders',
    description: 'View and manage all orders',
    path: '/orders',
    keywords: ['orders', 'order list', 'sales', 'invoices', 'billing'],
    icon: ShoppingCart
  },
  {
    id: 'products',
    label: 'Products',
    description: 'Product catalog and pricing',
    path: '/products',
    keywords: ['products', 'catalog', 'inventory', 'sku', 'items', 'stock'],
    icon: Package
  },
  {
    id: 'customers',
    label: 'Customers',
    description: 'Customer profiles and credit ledger',
    path: '/customers',
    keywords: ['customers', 'clients', 'buyers', 'credit', 'udhaar', 'ledger'],
    icon: Users
  },
  {
    id: 'expenses',
    label: 'Expenses',
    description: 'Daily business expenses',
    path: '/expenses',
    keywords: ['expenses', 'spending', 'costs', 'payments', 'wallet'],
    icon: Wallet
  },
  {
    id: 'reports',
    label: 'Reports',
    description: 'Sales and business reports',
    path: '/reports',
    keywords: ['reports', 'analytics', 'charts', 'trends', 'summary'],
    icon: BarChart3
  },
  {
    id: 'invoice-layouts',
    label: 'Invoice layouts',
    description: 'Design PDF bill format and fields',
    path: '/invoice-layouts',
    keywords: ['invoice', 'layout', 'bill format', 'pdf', 'template', 'design', 'print'],
    icon: FileStack
  },
  {
    id: 'settings',
    label: 'Settings',
    description: 'Company, team and app preferences',
    path: '/settings',
    keywords: ['settings', 'preferences', 'company', 'team', 'theme', 'config'],
    icon: Settings
  },
  {
    id: 'settings-whatsapp',
    label: 'WhatsApp settings',
    description: 'Connection, menu and templates',
    path: '/settings?tab=whatsapp',
    keywords: ['whatsapp settings', 'whatsapp connect', 'qr', 'templates', 'menu'],
    icon: MessageCircle
  },
  {
    id: 'settings-expenses',
    label: 'Expense categories',
    description: 'Manage expense category presets',
    path: '/settings?tab=expenses',
    keywords: ['expense categories', 'expense types', 'tags'],
    icon: Tags
  },
  {
    id: 'settings-team',
    label: 'Team users',
    description: 'Admin and staff accounts',
    path: '/settings?tab=team',
    keywords: ['team', 'users', 'staff', 'admin', 'login accounts'],
    icon: Users
  }
]

function scorePageMatch(item: GlobalSearchPageItem, query: string): number {
  const q = query.toLowerCase()
  const label = item.label.toLowerCase()
  const description = item.description.toLowerCase()

  if (label === q) return 100
  if (label.startsWith(q)) return 90
  if (label.includes(q)) return 80
  if (description.includes(q)) return 70

  for (const keyword of item.keywords) {
    const k = keyword.toLowerCase()
    if (k === q) return 85
    if (k.startsWith(q) || q.startsWith(k)) return 75
    if (k.includes(q) || q.includes(k)) return 65
  }

  return 0
}

export function matchGlobalSearchPages(query: string): GlobalSearchPageItem[] {
  const trimmed = query.trim()
  if (!trimmed) {
    return [...GLOBAL_SEARCH_QUICK_ACTIONS, ...GLOBAL_SEARCH_PAGES]
  }

  const scored = [...GLOBAL_SEARCH_QUICK_ACTIONS, ...GLOBAL_SEARCH_PAGES]
    .map((item) => ({ item, score: scorePageMatch(item, trimmed) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)

  return scored.map(({ item }) => item)
}

export function hasPageKeywordMatch(query: string): boolean {
  return matchGlobalSearchPages(query).length > 0
}
