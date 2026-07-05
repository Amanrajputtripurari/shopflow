import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'

import { AppShell } from '@/components/layout/app-shell'
import { AuthProvider } from '@/hooks/use-auth'
import { LoginPage } from '@/pages/auth/login-page'
import { CustomersPage } from '@/pages/customers/customers-page'
import { DashboardPage } from '@/pages/dashboard/dashboard-page'
import { OrderDetailPage } from '@/pages/orders/order-detail-page'
import { OrdersPage } from '@/pages/orders/orders-page'
import { QuickOrderPage } from '@/pages/orders/quick-order-page'
import { ExpensesPage } from '@/pages/expenses/expenses-page'
import { ProductsPage } from '@/pages/products/products-page'
import { ReportsPage } from '@/pages/reports/reports-page'
import { InvoiceLayoutsPage } from '@/pages/invoice-layouts/invoice-layouts-page'
import { InboxPage } from '@/pages/whatsapp/inbox-page'
import { SettingsPage } from '@/pages/settings/settings-page'
import { SetupPage } from '@/pages/setup/setup-page'
import { RootGuard } from '@/routes/root-guard'

export function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route element={<RootGuard />}>
            <Route path="/setup" element={<SetupPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route element={<AppShell />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/orders/new" element={<QuickOrderPage />} />
              <Route path="/orders/:id" element={<OrderDetailPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/expenses" element={<ExpensesPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/invoice-layouts" element={<InvoiceLayoutsPage />} />
              <Route path="/inbox" element={<InboxPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </HashRouter>
      <Toaster richColors closeButton />
    </AuthProvider>
  )
}
