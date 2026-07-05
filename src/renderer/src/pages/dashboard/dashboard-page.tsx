import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  CreditCard,
  Package,
  Plus,
  Receipt,
  ShoppingCart,
  TrendingUp,
  Users,
  Wallet
} from 'lucide-react'

import { OrderStatusChart } from '@/components/charts/analytics-charts'
import { SalesExpenseAreaChart } from '@/components/charts/sales-expense-area-chart'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { useAppSettings, useDbStatus } from '@/hooks/use-app-data'
import { formatCurrency } from '@/lib/format'

export function DashboardPage() {
  const { settings } = useAppSettings()
  const { status } = useDbStatus()
  const [companyName, setCompanyName] = useState(settings?.companyName ?? '')

  const statsQuery = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const result = await window.api.dashboard.stats()
      if (!result.ok) throw new Error(result.error)
      return result.data
    }
  })

  useEffect(() => {
    void window.api.company.get().then((result) => {
      if (result.ok && result.data.name) {
        setCompanyName(result.data.name)
      }
    })
  }, [])

  const stats = statsQuery.data
  const loading = statsQuery.isLoading
  const netTone = (stats?.todayRoughNet ?? 0) >= 0 ? 'positive' : 'negative'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={
          <>
            {companyName || settings?.companyName ? `${companyName || settings?.companyName} · ` : ''}
            Today&apos;s overview, trends, and quick actions.
            {status?.connected === false ? ' (Database offline)' : ''}
          </>
        }
        actions={
          <Button asChild size="lg">
            <Link to="/orders/new">
              <Plus className="size-4" />
              Quick order
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Today's orders"
          value={stats?.todayOrderCount ?? '—'}
          hint={stats ? formatCurrency(stats.todayOrderTotal) : undefined}
          icon={ShoppingCart}
          href="/orders"
          hrefLabel="View orders"
          loading={loading}
        />
        <KpiCard
          label="Today's expenses"
          value={stats ? formatCurrency(stats.todayExpenseTotal) : '—'}
          icon={Receipt}
          tone="warning"
          href="/expenses"
          hrefLabel="View expenses"
          loading={loading}
        />
        <KpiCard
          label="Rough net today"
          value={stats ? formatCurrency(stats.todayRoughNet) : '—'}
          icon={TrendingUp}
          tone={netTone}
          href="/reports"
          hrefLabel="Full reports"
          loading={loading}
        />
        <KpiCard
          label="Open orders"
          value={stats?.openOrderCount ?? '—'}
          hint="Not delivered or cancelled"
          icon={Package}
          href="/orders"
          hrefLabel="Manage orders"
          loading={loading}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <SalesExpenseAreaChart
            data={stats?.last7Days ?? []}
            title="Last 7 days"
            description="Sales and expenses trend"
            loading={loading}
          />
        </div>
        <OrderStatusChart data={stats?.orderStatusCounts ?? []} loading={loading} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          label="Catalog"
          value={`${stats?.productCount ?? '—'} products`}
          hint={`${stats?.customerCount ?? '—'} active customers`}
          icon={Users}
          href="/products"
          hrefLabel="Manage catalog"
          loading={loading}
        />
        <KpiCard
          label="Outstanding credit"
          value={stats ? formatCurrency(stats.outstandingCredit) : '—'}
          hint="Total customer balances"
          icon={CreditCard}
          tone="warning"
          href="/customers"
          hrefLabel="View customers"
          loading={loading}
        />
        <KpiCard
          label="Cash flow hint"
          value={stats ? formatCurrency(stats.todayOrderTotal - stats.todayExpenseTotal) : '—'}
          hint="Today's orders minus expenses"
          icon={Wallet}
          tone={netTone}
          loading={loading}
        />
      </div>
    </div>
  )
}
