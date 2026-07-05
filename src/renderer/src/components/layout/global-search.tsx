import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Search, ShoppingBag } from 'lucide-react'

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut
} from '@/components/ui/command'
import { useGlobalSearchResults } from '@/hooks/use-global-search-results'
import { cn } from '@/lib/utils'

interface GlobalSearchContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  toggle: () => void
}

const GlobalSearchContext = createContext<GlobalSearchContextValue | null>(null)

export function useGlobalSearch() {
  const context = useContext(GlobalSearchContext)
  if (!context) {
    throw new Error('useGlobalSearch must be used within GlobalSearchProvider')
  }
  return context
}

interface GlobalSearchProviderProps {
  children: ReactNode
}

export function GlobalSearchProvider({ children }: GlobalSearchProviderProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const toggle = useCallback(() => setOpen((current) => !current), [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen((current) => !current)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (!open) {
      setQuery('')
    }
  }, [open])

  return (
    <GlobalSearchContext.Provider value={{ open, setOpen, toggle }}>
      {children}
      <GlobalSearchDialog open={open} onOpenChange={setOpen} query={query} onQueryChange={setQuery} />
    </GlobalSearchContext.Provider>
  )
}

interface GlobalSearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  query: string
  onQueryChange: (query: string) => void
}

function GlobalSearchDialog({ open, onOpenChange, query, onQueryChange }: GlobalSearchDialogProps) {
  const navigate = useNavigate()
  const { pageResults, shouldSearchEntities, customers, orders, entitiesLoading } =
    useGlobalSearchResults(query, open)

  const trimmed = query.trim()
  const showQuickActions = !trimmed
  const showPages = !trimmed || pageResults.length > 0

  const quickActions = useMemo(
    () => pageResults.filter((item) => item.id === 'new-order'),
    [pageResults]
  )
  const pages = useMemo(
    () => pageResults.filter((item) => item.id !== 'new-order'),
    [pageResults]
  )

  const runAction = useCallback(
    (path: string) => {
      onOpenChange(false)
      navigate(path)
    },
    [navigate, onOpenChange]
  )

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} shouldFilter={false}>
      <CommandInput
        placeholder="Search pages, customers, orders…"
        value={query}
        onValueChange={onQueryChange}
      />
      <CommandList>
        {entitiesLoading && shouldSearchEntities && (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Searching…
          </div>
        )}

        {!entitiesLoading && shouldSearchEntities && customers.length === 0 && orders.length === 0 && (
          <CommandEmpty>No customers or orders found.</CommandEmpty>
        )}

        {!shouldSearchEntities && trimmed && pages.length === 0 && quickActions.length === 0 && (
          <CommandEmpty>No matching pages.</CommandEmpty>
        )}

        {showQuickActions && quickActions.length > 0 && (
          <CommandGroup heading="Quick actions">
            {quickActions.map((item) => {
              const Icon = item.icon
              return (
                <CommandItem key={item.id} value={item.id} onSelect={() => runAction(item.path)}>
                  <Icon />
                  <div className="flex min-w-0 flex-col">
                    <span>{item.label}</span>
                    <span className="truncate text-xs text-muted-foreground">{item.description}</span>
                  </div>
                  {item.shortcut && <CommandShortcut>{item.shortcut}</CommandShortcut>}
                </CommandItem>
              )
            })}
          </CommandGroup>
        )}

        {showPages && pages.length > 0 && (
          <>
            {showQuickActions && quickActions.length > 0 && <CommandSeparator />}
            <CommandGroup heading={trimmed ? 'Pages' : 'Go to page'}>
              {pages.map((item) => {
                const Icon = item.icon
                return (
                  <CommandItem key={item.id} value={item.id} onSelect={() => runAction(item.path)}>
                    <Icon />
                    <div className="flex min-w-0 flex-col">
                      <span>{item.label}</span>
                      <span className="truncate text-xs text-muted-foreground">{item.description}</span>
                    </div>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </>
        )}

        {shouldSearchEntities && customers.length > 0 && (
          <>
            {(showPages || quickActions.length > 0) && <CommandSeparator />}
            <CommandGroup heading="Customers">
              {customers.map((customer) => (
                <CommandItem
                  key={`customer-order-${customer.id}`}
                  value={`customer-order-${customer.id}-${customer.name}-${customer.phone}`}
                  onSelect={() => runAction(`/orders/new?customerId=${customer.id}`)}
                >
                  <ShoppingBag />
                  <div className="flex min-w-0 flex-col">
                    <span>Create order · {customer.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {customer.phone ? `+${customer.phone}` : 'No phone'}
                      {customer.creditBalance > 0
                        ? ` · Credit ₹${customer.creditBalance.toLocaleString('en-IN')}`
                        : ''}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {shouldSearchEntities && orders.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Orders">
              {orders.map((order) => (
                <CommandItem
                  key={order.id}
                  value={`order-${order.id}-${order.orderNo}`}
                  onSelect={() => runAction(`/orders/${order.id}`)}
                >
                  <ShoppingBag />
                  <div className="flex min-w-0 flex-col">
                    <span>{order.orderNo}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {order.customerName} · {order.status} · ₹{order.totals.grandTotal.toLocaleString('en-IN')}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}

interface GlobalSearchTriggerProps {
  className?: string
}

export function GlobalSearchTrigger({ className }: GlobalSearchTriggerProps) {
  const { setOpen } = useGlobalSearch()
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/.test(navigator.platform)
  const shortcutLabel = isMac ? '⌘K' : 'Ctrl+K'

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={cn(
        'hidden h-9 min-w-[220px] max-w-sm flex-1 items-center gap-2 rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted/70 sm:flex lg:min-w-[280px]',
        className
      )}
    >
      <Search className="mr-2 size-4 shrink-0 opacity-50" />
      <span className="flex-1 truncate text-left">Search pages, customers, orders…</span>
      <kbd className="pointer-events-none hidden rounded border bg-background px-1.5 py-0.5 font-mono text-[10px] font-medium sm:inline-block">
        {shortcutLabel}
      </kbd>
    </button>
  )
}

export function GlobalSearchMobileTrigger({ className }: GlobalSearchTriggerProps) {
  const { setOpen } = useGlobalSearch()

  return (
    <button
      type="button"
      aria-label="Open search"
      onClick={() => setOpen(true)}
      className={cn(
        'inline-flex size-9 items-center justify-center rounded-md border border-input bg-muted/40 text-muted-foreground transition-colors hover:bg-muted/70 sm:hidden',
        className
      )}
    >
      <Search className="size-4" aria-hidden="true" />
    </button>
  )
}
