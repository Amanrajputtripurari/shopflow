export interface ReportPeriodInput {
  from: string
  to: string
}

export interface DailyTrendPoint {
  date: string
  sales: number
  expenses: number
}

export interface SalesSummary {
  orderCount: number
  totalSales: number
  paidAmount: number
  creditAmount: number
}

export interface ExpenseCategoryBreakdown {
  categoryName: string
  total: number
  count: number
}

export interface ExpenseSummary {
  entryCount: number
  totalExpenses: number
  byCategory: ExpenseCategoryBreakdown[]
}

export interface SummaryReport {
  from: string
  to: string
  sales: SalesSummary
  expenses: ExpenseSummary
  roughNet: number
  dailyTrend: DailyTrendPoint[]
}
