import { parseDateKey, toDateKey } from './dates'

export interface DailyTrendPoint {
  date: string
  sales: number
  expenses: number
}

export function eachDateKey(from: string, to: string): string[] {
  const dates: string[] = []
  const current = parseDateKey(from)
  const end = parseDateKey(to)

  while (current <= end) {
    dates.push(toDateKey(current))
    current.setDate(current.getDate() + 1)
  }

  return dates
}

export function mergeDailyTrend(
  from: string,
  to: string,
  salesByDate: Map<string, number>,
  expensesByDate: Map<string, number>
): DailyTrendPoint[] {
  return eachDateKey(from, to).map((date) => ({
    date,
    sales: Math.round((salesByDate.get(date) ?? 0) * 100) / 100,
    expenses: Math.round((expensesByDate.get(date) ?? 0) * 100) / 100
  }))
}

export function lastNDaysRange(days: number): { from: string; to: string } {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - (days - 1))
  return { from: toDateKey(from), to: toDateKey(to) }
}

export function formatChartDate(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(
    new Date(year, month - 1, day)
  )
}
