import type { ReportPeriodInput, SummaryReport } from '@shared/types/report'
import { mergeDailyTrend } from '../helpers/analytics'
import { expensesRepository } from '../repositories/expenses.repository'
import { ordersRepository } from '../repositories/orders.repository'

export class ReportsService {
  async getSummary(input: ReportPeriodInput): Promise<SummaryReport> {
    this.validatePeriod(input)

    const [sales, expenses, salesByDay, expensesByDay] = await Promise.all([
      ordersRepository.getSalesSummary(input.from, input.to),
      expensesRepository.getSummary(input.from, input.to),
      ordersRepository.getDailySalesTotals(input.from, input.to),
      expensesRepository.getDailyExpenseTotals(input.from, input.to)
    ])

    const totalSales = Math.round(sales.totalSales * 100) / 100
    const totalExpenses = Math.round(expenses.totalExpenses * 100) / 100

    return {
      from: input.from,
      to: input.to,
      sales: {
        orderCount: sales.orderCount,
        totalSales,
        paidAmount: Math.round(sales.paidAmount * 100) / 100,
        creditAmount: Math.round(sales.creditAmount * 100) / 100
      },
      expenses: {
        entryCount: expenses.entryCount,
        totalExpenses,
        byCategory: expenses.byCategory
      },
      roughNet: Math.round((totalSales - totalExpenses) * 100) / 100,
      dailyTrend: mergeDailyTrend(input.from, input.to, salesByDay, expensesByDay)
    }
  }

  private validatePeriod(input: ReportPeriodInput): void {
    if (!input.from?.trim() || !input.to?.trim()) {
      throw new Error('From and to dates are required.')
    }

    if (input.from > input.to) {
      throw new Error('From date cannot be after to date.')
    }
  }
}

export const reportsService = new ReportsService()
