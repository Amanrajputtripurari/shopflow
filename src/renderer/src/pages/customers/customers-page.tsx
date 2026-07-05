import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Pencil, Plus, ScrollText, Search, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'

import { CustomerLedgerDialog } from '@/components/customers/customer-ledger-dialog'
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
import { Label } from '@/components/ui/label'
import { ListPagination } from '@/components/ui/list-pagination'
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
import { formatCurrency } from '@/lib/format'
import type { Customer, CustomerInput } from '@shared/types/customer'

const emptyForm: CustomerInput = {
  name: '',
  phone: '',
  address: '',
  gstin: '',
  active: true
}

export function CustomersPage() {
  const { isAdmin } = useAuth()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [ledgerCustomer, setLedgerCustomer] = useState<Customer | null>(null)
  const [form, setForm] = useState<CustomerInput>(emptyForm)
  const { page, pageSize, offset, setPage, setPageSize, resetPage } = usePagination()
  const debouncedSearch = useDebouncedValue(search, 300)

  useResetPagination(resetPage, [debouncedSearch])

  const customersQuery = useQuery({
    queryKey: ['customers', debouncedSearch, page, pageSize],
    queryFn: async () => {
      const result = await window.api.customers.list({
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
      const result = editing
        ? await window.api.customers.update(editing.id, form)
        : await window.api.customers.create(form)
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
    onSuccess: () => {
      toast.success(editing ? 'Customer updated' : 'Customer created')
      setOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
    onError: (error: Error) => toast.error(error.message)
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await window.api.customers.delete(id)
      if (!result.ok) throw new Error(result.error)
    },
    onSuccess: () => {
      toast.success('Customer deleted')
      setDeleteId(null)
      void queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
    onError: (error: Error) => toast.error(error.message)
  })

  const dialogTitle = useMemo(() => (editing ? 'Edit customer' : 'Add customer'), [editing])
  const customers = customersQuery.data?.items ?? []
  const totalCustomers = customersQuery.data?.total ?? 0

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setOpen(true)
  }

  const openEdit = (customer: Customer) => {
    setEditing(customer)
    setForm({
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      gstin: customer.gstin,
      active: customer.active
    })
    setOpen(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Manage walk-in and regular customers. Phone is optional for retail."
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Add customer
          </Button>
        }
      />

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Customer list</CardTitle>
          <CardDescription>
            {totalCustomers} customer{totalCustomers === 1 ? '' : 's'} found
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or phone…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>

          {customersQuery.isLoading ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>GSTIN</TableHead>
                  <TableHead>Credit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableSkeleton columns={7} />
              </TableBody>
            </Table>
          ) : customers.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No customers yet"
              description="Add customers to speed up order creation and delivery."
              action={
                <Button onClick={openCreate}>
                  <Plus className="size-4" />
                  Add customer
                </Button>
              }
            />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>GSTIN</TableHead>
                    <TableHead>Credit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell>{customer.phone || '—'}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{customer.address || '—'}</TableCell>
                      <TableCell>{customer.gstin || '—'}</TableCell>
                      <TableCell className={customer.creditBalance > 0 ? 'font-medium text-destructive' : ''}>
                        {formatCurrency(customer.creditBalance)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={customer.active ? 'default' : 'secondary'}>
                          {customer.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="icon" onClick={() => setLedgerCustomer(customer)}>
                            <ScrollText className="size-4" />
                            <span className="sr-only">Ledger</span>
                          </Button>
                          <Button variant="outline" size="icon" onClick={() => openEdit(customer)}>
                            <Pencil className="size-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          {isAdmin && (
                            <Button variant="outline" size="icon" onClick={() => setDeleteId(customer.id)}>
                              <Trash2 className="size-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          )}
                        </div>
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
            total={totalCustomers}
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
              {editing ? 'Update customer information.' : 'Create a new customer profile for orders.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="customer-name">Name</Label>
              <Input
                id="customer-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Customer name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer-phone">Phone</Label>
                <Input
                  id="customer-phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-gstin">GSTIN</Label>
                <Input
                  id="customer-gstin"
                  value={form.gstin}
                  onChange={(e) => setForm({ ...form, gstin: e.target.value })}
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-address">Address</Label>
              <Textarea
                id="customer-address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Delivery or billing address"
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="customer-active">Active</Label>
                <p className="text-xs text-muted-foreground">Inactive customers are hidden from pickers</p>
              </div>
              <Switch
                id="customer-active"
                checked={form.active ?? true}
                onCheckedChange={(checked) => setForm({ ...form, active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={saveMutation.isPending || !form.name.trim()} onClick={() => void saveMutation.mutateAsync()}>
              {saveMutation.isPending && <Loader2 className="animate-spin" />}
              Save customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete customer?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the customer. Existing orders will keep the name snapshot.
            </AlertDialogDescription>
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

      <CustomerLedgerDialog
        customer={ledgerCustomer}
        open={Boolean(ledgerCustomer)}
        onOpenChange={(open) => !open && setLedgerCustomer(null)}
      />
    </div>
  )
}
