import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BarChart3, Loader2, Pencil, Plus, Search, Trash2, Wallet } from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/layout/page-header'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { NumericInput } from '@/components/ui/numeric-input'
import { Label } from '@/components/ui/label'
import { ListPagination } from '@/components/ui/list-pagination'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { TableSkeleton } from '@/components/ui/table-skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/use-auth'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { usePagination, useResetPagination } from '@/hooks/use-pagination'
import { formatCurrency, formatDate } from '@/lib/format'
import type { Expense, ExpenseInput, ExpensePaymentMode } from '@shared/types/expense'

function todayKey(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const paymentModes: ExpensePaymentMode[] = ['cash', 'upi', 'card', 'bank', 'other']

const emptyForm: ExpenseInput = {
  date: todayKey(),
  amount: 0,
  categoryId: null,
  customCategoryName: '',
  saveCustomAsPreset: false,
  paymentMode: 'cash',
  note: ''
}

export function ExpensesPage() {
  const { isAdmin } = useAuth()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState(todayKey())
  const [to, setTo] = useState(todayKey())
  const [open, setOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [useCustomCategory, setUseCustomCategory] = useState(false)
  const [form, setForm] = useState<ExpenseInput>(emptyForm)
  const { page, pageSize, offset, setPage, setPageSize, resetPage } = usePagination()
  const debouncedSearch = useDebouncedValue(search, 300)

  useResetPagination(resetPage, [debouncedSearch, from, to])

  const categoriesQuery = useQuery({
    queryKey: ['expense-categories'],
    queryFn: async () => {
      const result = await window.api.expenseCategories.list()
      if (!result.ok) throw new Error(result.error)
      return result.data.filter((category) => category.active)
    }
  })

  const expensesQuery = useQuery({
    queryKey: ['expenses', from, to, debouncedSearch, page, pageSize],
    queryFn: async () => {
      const result = await window.api.expenses.list({
        from,
        to,
        search: debouncedSearch || undefined,
        limit: pageSize,
        offset
      })
      if (!result.ok) throw new Error(result.error)
      return result.data
    }
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: ExpenseInput = {
        ...form,
        categoryId: useCustomCategory ? null : form.categoryId,
        customCategoryName: useCustomCategory ? form.customCategoryName : undefined,
        saveCustomAsPreset: useCustomCategory ? form.saveCustomAsPreset : false
      }

      const result = editing
        ? await window.api.expenses.update(editing.id, payload)
        : await window.api.expenses.create(payload)
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
    onSuccess: () => {
      toast.success(editing ? 'Expense updated' : 'Expense recorded')
      setOpen(false)
      setEditing(null)
      setForm(emptyForm)
      setUseCustomCategory(false)
      void queryClient.invalidateQueries({ queryKey: ['expenses'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
    onError: (error: Error) => toast.error(error.message)
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await window.api.expenses.delete(id)
      if (!result.ok) throw new Error(result.error)
    },
    onSuccess: () => {
      toast.success('Expense deleted')
      setDeleteId(null)
      void queryClient.invalidateQueries({ queryKey: ['expenses'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
    onError: (error: Error) => toast.error(error.message)
  })

  const expenses = expensesQuery.data?.items ?? []
  const totalEntries = expensesQuery.data?.total ?? 0
  const totalAmount = expensesQuery.data?.totalAmount ?? 0
  const dialogTitle = useMemo(() => (editing ? 'Edit expense' : 'Record expense'), [editing])

  const openCreate = () => {
    setEditing(null)
    setForm({ ...emptyForm, date: todayKey() })
    setUseCustomCategory(false)
    setOpen(true)
  }

  const openEdit = (expense: Expense) => {
    setEditing(expense)
    setUseCustomCategory(expense.customCategory)
    setForm({
      date: expense.date,
      amount: expense.amount,
      categoryId: expense.categoryId,
      customCategoryName: expense.customCategory ? expense.categoryName : '',
      saveCustomAsPreset: false,
      paymentMode: expense.paymentMode,
      note: expense.note,
      receiptRef: expense.receiptRef
    })
    setOpen(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description="Daily expense feed. Staff can add entries; admins can edit or delete."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link to="/reports">
                <BarChart3 className="size-4" />
                Reports
              </Link>
            </Button>
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              Add expense
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Expense feed</CardTitle>
          <CardDescription>
            {totalEntries} entr{totalEntries === 1 ? 'y' : 'ies'} · {formatCurrency(totalAmount)} total
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative max-w-xs flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search category or note…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[160px]" />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[160px]" />
          </div>

          {expensesQuery.isLoading ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead>By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableSkeleton columns={7} />
              </TableBody>
            </Table>
          ) : expenses.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="No expenses in this period"
              description="Record shop expenses to track daily costs and rough profit."
              action={
                <Button onClick={openCreate}>
                  <Plus className="size-4" />
                  Add expense
                </Button>
              }
            />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead>By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>{formatDate(expense.date)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{expense.categoryName}</span>
                          {expense.customCategory && <Badge variant="outline">Custom</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(expense.amount)}</TableCell>
                      <TableCell className="capitalize">{expense.paymentMode}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{expense.note || '—'}</TableCell>
                      <TableCell>{expense.createdByName}</TableCell>
                      <TableCell className="text-right">
                        {isAdmin ? (
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="icon" onClick={() => openEdit(expense)}>
                              <Pencil className="size-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => setDeleteId(expense.id)}>
                              <Trash2 className="size-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </div>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <ListPagination
            page={page}
            pageSize={pageSize}
            total={totalEntries}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>
              {editing ? 'Update expense details.' : 'Record a shop expense for the selected date.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expense-date">Date</Label>
                <Input
                  id="expense-date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expense-amount">Amount (₹)</Label>
                <NumericInput
                  id="expense-amount"
                  value={form.amount}
                  onNumberChange={(amount) => setForm({ ...form, amount })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="expense-custom-category">Custom category</Label>
                <p className="text-xs text-muted-foreground">Use free text instead of a preset</p>
              </div>
              <Switch
                id="expense-custom-category"
                checked={useCustomCategory}
                onCheckedChange={setUseCustomCategory}
              />
            </div>

            {useCustomCategory ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="expense-custom-name">Category name</Label>
                  <Input
                    id="expense-custom-name"
                    value={form.customCategoryName ?? ''}
                    onChange={(e) => setForm({ ...form, customCategoryName: e.target.value })}
                    placeholder="e.g. Shop repairs"
                  />
                </div>
                {isAdmin && !editing && (
                  <div className="flex items-center gap-2">
                    <Switch
                      id="expense-save-preset"
                      checked={form.saveCustomAsPreset ?? false}
                      onCheckedChange={(checked) => setForm({ ...form, saveCustomAsPreset: checked })}
                    />
                    <Label htmlFor="expense-save-preset">Save as preset category</Label>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Preset category</Label>
                <Select
                  value={form.categoryId ?? undefined}
                  onValueChange={(value) => setForm({ ...form, categoryId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {(categoriesQuery.data ?? []).map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Payment mode</Label>
              <Select
                value={form.paymentMode}
                onValueChange={(value) => setForm({ ...form, paymentMode: value as ExpensePaymentMode })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentModes.map((mode) => (
                    <SelectItem key={mode} value={mode} className="capitalize">
                      {mode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expense-note">Note</Label>
              <Textarea
                id="expense-note"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Optional details"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={saveMutation.isPending} onClick={() => void saveMutation.mutateAsync()}>
              {saveMutation.isPending && <Loader2 className="animate-spin" />}
              Save expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete expense?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && void deleteMutation.mutateAsync(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
