import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'

import { ChartCard, ChartEmpty } from '@/components/charts/chart-card'
import { STATUS_LABELS } from '@/components/ui/order-status-badge'
import { formatCurrency } from '@/lib/format'
import {
  ORDER_STATUS_CHART_COLORS,
  useChartColors
} from '@/lib/chart-theme'
import type { ExpenseCategoryBreakdown } from '@shared/types/report'
import type { OrderStatus } from '@shared/types/order'

interface ExpenseCategoryChartProps {
  data: ExpenseCategoryBreakdown[]
  loading?: boolean
}

export function ExpenseCategoryChart({ data, loading }: ExpenseCategoryChartProps) {
  const colors = useChartColors()
  const palette = [
    colors.primary,
    colors.emerald,
    colors.amber,
    colors.violet,
    colors.destructive,
    colors.blue,
    'hsl(199 89% 48%)',
    'hsl(24 95% 53%)'
  ]
  const chartData = data.map((row, index) => ({
    name: row.categoryName,
    value: row.total,
    fill: palette[index % palette.length]
  }))

  return (
    <ChartCard
      title="Expenses by category"
      description="Share of spend in this period"
      loading={loading}
    >
      {chartData.length === 0 ? (
        <ChartEmpty message="No expenses in this period." />
      ) : (
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={62}
                outerRadius={96}
                paddingAngle={2}
                stroke={colors.card}
                strokeWidth={2}
              >
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => formatCurrency(Number(value ?? 0))}
                contentStyle={{
                  background: colors.card,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 8,
                  fontSize: 12
                }}
              />
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                wrapperStyle={{ fontSize: 11, maxWidth: 140 }}
                formatter={(value) => (
                  <span className="text-muted-foreground">{String(value)}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  )
}

interface OrderStatusChartProps {
  data: { status: OrderStatus; count: number }[]
  loading?: boolean
}

export function OrderStatusChart({ data, loading }: OrderStatusChartProps) {
  const colors = useChartColors()
  const chartData = data
    .filter((row) => row.count > 0)
    .map((row) => ({
      name: STATUS_LABELS[row.status],
      value: row.count,
      fill: ORDER_STATUS_CHART_COLORS[row.status]
    }))

  return (
    <ChartCard title="Orders by status" description="Current pipeline snapshot" loading={loading}>
      {chartData.length === 0 ? (
        <ChartEmpty message="No orders yet." />
      ) : (
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} horizontal={false} />
              <XAxis type="number" tick={{ fill: colors.muted, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="name"
                width={108}
                tick={{ fill: colors.muted, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value) => [`${Number(value ?? 0)} orders`, 'Count']}
                contentStyle={{
                  background: colors.card,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 8,
                  fontSize: 12
                }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={28}>
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  )
}

interface SalesBreakdownChartProps {
  totalSales: number
  paidAmount: number
  creditAmount: number
  loading?: boolean
}

export function SalesBreakdownChart({
  totalSales,
  paidAmount,
  creditAmount,
  loading
}: SalesBreakdownChartProps) {
  const colors = useChartColors()
  const unpaid = Math.max(0, totalSales - paidAmount - creditAmount)
  const chartData = [
    { name: 'Collected', value: paidAmount, fill: colors.emerald },
    { name: 'On credit', value: creditAmount, fill: colors.amber },
    { name: 'Unpaid', value: unpaid, fill: colors.destructive }
  ].filter((row) => row.value > 0)

  return (
    <ChartCard title="Sales collection" description="How order value was received" loading={loading}>
      {totalSales <= 0 ? (
        <ChartEmpty message="No sales in this period." />
      ) : (
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: colors.muted, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(value: number) =>
                  value >= 1000 ? `₹${(value / 1000).toFixed(0)}k` : `₹${value}`
                }
                tick={{ fill: colors.muted, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={48}
              />
              <Tooltip
                formatter={(value) => formatCurrency(Number(value ?? 0))}
                contentStyle={{
                  background: colors.card,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 8,
                  fontSize: 12
                }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={72}>
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  )
}

interface NetComparisonChartProps {
  sales: number
  expenses: number
  loading?: boolean
}

export function NetComparisonChart({ sales, expenses, loading }: NetComparisonChartProps) {
  const colors = useChartColors()
  const net = sales - expenses
  const chartData = [
    { name: 'Sales', value: sales, fill: colors.primary },
    { name: 'Expenses', value: expenses, fill: colors.destructive },
    { name: 'Net', value: net, fill: net >= 0 ? colors.emerald : colors.destructive }
  ]

  return (
    <ChartCard title="Period summary" description="Sales, expenses and rough net" loading={loading}>
      {sales <= 0 && expenses <= 0 ? (
        <ChartEmpty />
      ) : (
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: colors.muted, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(value: number) =>
                  value >= 1000 ? `₹${(value / 1000).toFixed(0)}k` : `₹${value}`
                }
                tick={{ fill: colors.muted, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={48}
              />
              <Tooltip
                formatter={(value) => formatCurrency(Number(value ?? 0))}
                contentStyle={{
                  background: colors.card,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 8,
                  fontSize: 12
                }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={80}>
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  )
}
