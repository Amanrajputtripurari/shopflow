import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'

import { ChartCard, ChartEmpty } from '@/components/charts/chart-card'
import { formatCurrency } from '@/lib/format'
import { formatChartAxisDate, useChartColors } from '@/lib/chart-theme'
import type { DailyTrendPoint } from '@shared/types/report'

interface SalesExpenseAreaChartProps {
  data: DailyTrendPoint[]
  title?: string
  description?: string
  loading?: boolean
}

function ChartTooltip({
  active,
  payload,
  label
}: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
}) {
  if (!active || !payload?.length || !label) return null

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-popover-foreground shadow-md">
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">
        {formatChartAxisDate(String(label))}
      </p>
      <div className="space-y-1">
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between gap-4 text-sm">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ background: entry.color }} />
              {entry.name}
            </span>
            <span className="font-medium tabular-nums">{formatCurrency(entry.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function SalesExpenseAreaChart({
  data,
  title = 'Sales vs expenses',
  description = 'Daily trend over the selected period',
  loading
}: SalesExpenseAreaChartProps) {
  const colors = useChartColors()
  const hasData = data.some((point) => point.sales > 0 || point.expenses > 0)

  return (
    <ChartCard title={title} description={description} loading={loading}>
      {!hasData ? (
        <ChartEmpty />
      ) : (
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colors.primary} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={colors.primary} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colors.destructive} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={colors.destructive} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatChartAxisDate}
                tick={{ fill: colors.muted, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                minTickGap={24}
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
              <Tooltip content={<ChartTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                formatter={(value) => <span className="text-muted-foreground">{value}</span>}
              />
              <Area
                type="monotone"
                dataKey="sales"
                name="Sales"
                stroke={colors.primary}
                strokeWidth={2}
                fill="url(#salesGradient)"
              />
              <Area
                type="monotone"
                dataKey="expenses"
                name="Expenses"
                stroke={colors.destructive}
                strokeWidth={2}
                fill="url(#expenseGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  )
}
