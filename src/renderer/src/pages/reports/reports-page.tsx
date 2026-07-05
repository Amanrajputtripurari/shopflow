import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, Loader2, TrendingDown, TrendingUp, Wallet } from 'lucide-react'

import {
  ExpenseCategoryChart,
  NetComparisonChart,
  SalesBreakdownChart
} from '@/components/charts/analytics-charts'
import { SalesExpenseAreaChart } from '@/components/charts/sales-expense-area-chart'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/format'

function monthStartKey(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}-01`
}

function todayKey(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function ReportsPage() {
  const [from, setFrom] = useState(monthStartKey())
  const [to, setTo] = useState(todayKey())
  const [applied, setApplied] = useState({ from: monthStartKey(), to: todayKey() })

  const reportQuery = useQuery({
    queryKey: ['reports-summary', applied.from, applied.to],
    queryFn: async () => {
      const result = await window.api.reports.summary({ from: applied.from, to: applied.to })
      if (!result.ok) throw new Error(result.error)
      return result.data
    }
  })

  const report = reportQuery.data
  const loading = reportQuery.isLoading || reportQuery.isFetching
  const netPositive = useMemo(() => (report?.roughNet ?? 0) >= 0, [report?.roughNet])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Sales, expenses, and rough profit analytics for any date range."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Report period</CardTitle>
          <CardDescription>Select dates and run analytics for that window.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-2">
            <Label htmlFor="report-from">From</Label>
            <Input id="report-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="report-to">To</Label>
            <Input id="report-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button onClick={() => setApplied({ from, to })} disabled={reportQuery.isFetching}>
            {reportQuery.isFetching && <Loader2 className="animate-spin" />}
            Run report
          </Button>
        </CardContent>
      </Card>

      {reportQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading report…
        </div>
      ) : report ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Sales"
              value={formatCurrency(report.sales.totalSales)}
              hint={`${report.sales.orderCount} orders (excl. cancelled)`}
              icon={BarChart3}
              loading={loading}
            />
            <KpiCard
              label="Collected"
              value={formatCurrency(report.sales.paidAmount)}
              hint="Paid on orders in period"
              icon={Wallet}
              tone="positive"
              loading={loading}
            />
            <KpiCard
              label="Expenses"
              value={formatCurrency(report.expenses.totalExpenses)}
              hint={`${report.expenses.entryCount} entries`}
              icon={TrendingDown}
              tone="warning"
              loading={loading}
            />
            <KpiCard
              label="Rough net"
              value={formatCurrency(report.roughNet)}
              hint="Sales minus expenses"
              icon={TrendingUp}
              tone={netPositive ? 'positive' : 'negative'}
              loading={loading}
            />
          </div>

          <SalesExpenseAreaChart
            data={report.dailyTrend}
            title="Daily trend"
            description={`${applied.from} to ${applied.to}`}
            loading={loading}
          />

          <div className="grid gap-4 xl:grid-cols-3">
            <NetComparisonChart
              sales={report.sales.totalSales}
              expenses={report.expenses.totalExpenses}
              loading={loading}
            />
            <SalesBreakdownChart
              totalSales={report.sales.totalSales}
              paidAmount={report.sales.paidAmount}
              creditAmount={report.sales.creditAmount}
              loading={loading}
            />
            <ExpenseCategoryChart data={report.expenses.byCategory} loading={loading} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Expense breakdown</CardTitle>
              <CardDescription>
                {formatCurrency(report.expenses.totalExpenses)} across{' '}
                {report.expenses.byCategory.length} categories
              </CardDescription>
            </CardHeader>
            <CardContent>
              {report.expenses.byCategory.length === 0 ? (
                <p className="text-sm text-muted-foreground">No expenses recorded in this period.</p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead>Entries</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Share</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.expenses.byCategory.map((row) => {
                        const share =
                          report.expenses.totalExpenses > 0
                            ? (row.total / report.expenses.totalExpenses) * 100
                            : 0
                        return (
                          <TableRow key={row.categoryName}>
                            <TableCell className="font-medium">{row.categoryName}</TableCell>
                            <TableCell>{row.count}</TableCell>
                            <TableCell className="text-right font-medium tabular-nums">
                              {formatCurrency(row.total)}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground tabular-nums">
                              {share.toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
