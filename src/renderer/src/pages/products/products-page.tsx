import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Package, Pencil, Plus, Search, Trash2 } from 'lucide-react'
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
import { useAuth } from '@/hooks/use-auth'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { usePagination, useResetPagination } from '@/hooks/use-pagination'
import {
  ProductExtraChargesEditor,
  sanitizeProductExtraCharges
} from '@/components/products/product-extra-charges-editor'
import { formatCurrency } from '@/lib/format'
import type { Product, ProductInput } from '@shared/types/product'

const emptyForm: ProductInput = {
  name: '',
  sku: '',
  unit: 'pcs',
  hsnCode: '',
  price: 0,
  taxPercent: 0,
  extraCharges: [],
  currentStock: 0,
  trackStock: false,
  lowStockAlert: 0,
  active: true
}

export function ProductsPage() {
  const { isAdmin } = useAuth()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState<ProductInput>(emptyForm)
  const { page, pageSize, offset, setPage, setPageSize, resetPage } = usePagination()
  const debouncedSearch = useDebouncedValue(search, 300)

  useResetPagination(resetPage, [debouncedSearch])

  const productsQuery = useQuery({
    queryKey: ['products', debouncedSearch, page, pageSize],
    queryFn: async () => {
      const result = await window.api.products.list({
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
      const payload: ProductInput = {
        ...form,
        extraCharges: sanitizeProductExtraCharges(form.extraCharges ?? [])
      }
      const result = editing
        ? await window.api.products.update(editing.id, payload)
        : await window.api.products.create(payload)
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
    onSuccess: () => {
      toast.success(editing ? 'Product updated' : 'Product created')
      setOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (error: Error) => toast.error(error.message)
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await window.api.products.delete(id)
      if (!result.ok) throw new Error(result.error)
    },
    onSuccess: () => {
      toast.success('Product deleted')
      setDeleteId(null)
      void queryClient.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (error: Error) => toast.error(error.message)
  })

  const dialogTitle = useMemo(() => (editing ? 'Edit product' : 'Add product'), [editing])
  const products = productsQuery.data?.items ?? []
  const totalProducts = productsQuery.data?.total ?? 0

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setOpen(true)
  }

  const openEdit = (product: Product) => {
    setEditing(product)
    setForm({
      name: product.name,
      sku: product.sku,
      unit: product.unit,
      hsnCode: product.hsnCode,
      price: product.price,
      taxPercent: product.taxPercent,
      extraCharges: product.extraCharges.map((charge) => ({ ...charge })),
      currentStock: product.currentStock,
      trackStock: product.trackStock,
      lowStockAlert: product.lowStockAlert,
      active: product.active
    })
    setOpen(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="Manage your product catalog with pricing and tax."
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Add product
          </Button>
        }
      />

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Catalog</CardTitle>
          <CardDescription>
            {totalProducts} product{totalProducts === 1 ? '' : 's'} found
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or SKU…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>

          {productsQuery.isLoading ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>HSN</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Tax</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableSkeleton columns={9} />
              </TableBody>
            </Table>
          ) : products.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No products yet"
              description="Add your first product to start creating orders and bills."
              action={
                <Button onClick={openCreate}>
                  <Plus className="size-4" />
                  Add product
                </Button>
              }
            />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>HSN</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Tax</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{product.sku}</Badge>
                      </TableCell>
                      <TableCell>{product.hsnCode || '—'}</TableCell>
                      <TableCell>{product.unit}</TableCell>
                      <TableCell>{formatCurrency(product.price)}</TableCell>
                      <TableCell>
                        {product.trackStock ? (
                          <span className={product.currentStock <= product.lowStockAlert ? 'text-destructive font-medium' : ''}>
                            {product.currentStock}
                          </span>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>{product.taxPercent}%</TableCell>
                      <TableCell>
                        <Badge variant={product.active ? 'default' : 'secondary'}>
                          {product.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="icon" onClick={() => openEdit(product)}>
                            <Pencil className="size-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          {isAdmin && (
                            <Button variant="outline" size="icon" onClick={() => setDeleteId(product.id)}>
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
            total={totalProducts}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="gap-5 sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>
              {editing ? 'Update product details below.' : 'Fill in the details for a new catalog item.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="product-name">Name</Label>
              <Input
                id="product-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Product name"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="product-sku">SKU</Label>
                <Input
                  id="product-sku"
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  placeholder="SKU-001"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="product-unit">Unit</Label>
                <Input
                  id="product-unit"
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  placeholder="pcs, kg, box"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="product-hsn">HSN code</Label>
                <Input
                  id="product-hsn"
                  value={form.hsnCode}
                  onChange={(e) => setForm({ ...form, hsnCode: e.target.value })}
                  placeholder="For GST bills"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="product-low-stock">Low stock alert</Label>
                <NumericInput
                  id="product-low-stock"
                  integerOnly
                  value={form.lowStockAlert}
                  onNumberChange={(lowStockAlert) => setForm({ ...form, lowStockAlert })}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="product-price">Price (₹)</Label>
                <NumericInput
                  id="product-price"
                  value={form.price}
                  onNumberChange={(price) => setForm({ ...form, price })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="product-tax">Tax %</Label>
                <NumericInput
                  id="product-tax"
                  value={form.taxPercent}
                  onNumberChange={(taxPercent) => setForm({ ...form, taxPercent })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="product-stock">Current stock</Label>
                <NumericInput
                  id="product-stock"
                  integerOnly
                  value={form.currentStock}
                  disabled={!form.trackStock}
                  onNumberChange={(currentStock) => setForm({ ...form, currentStock })}
                />
              </div>
            </div>

            <ProductExtraChargesEditor
              value={form.extraCharges ?? []}
              onChange={(extraCharges) => setForm({ ...form, extraCharges })}
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                <div className="pr-3">
                  <Label htmlFor="product-track-stock" className="text-sm">
                    Track stock
                  </Label>
                  <p className="text-[11px] leading-snug text-muted-foreground">
                    Deduct on order confirm / bill
                  </p>
                </div>
                <Switch
                  id="product-track-stock"
                  checked={form.trackStock ?? false}
                  onCheckedChange={(checked) => setForm({ ...form, trackStock: checked })}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                <div className="pr-3">
                  <Label htmlFor="product-active" className="text-sm">
                    Active
                  </Label>
                  <p className="text-[11px] leading-snug text-muted-foreground">
                    Hidden from new orders when off
                  </p>
                </div>
                <Switch
                  id="product-active"
                  checked={form.active ?? true}
                  onCheckedChange={(checked) => setForm({ ...form, active: checked })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={saveMutation.isPending || !form.name.trim()} onClick={() => void saveMutation.mutateAsync()}>
              {saveMutation.isPending && <Loader2 className="animate-spin" />}
              Save product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete product?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The product will be removed from the catalog.
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
    </div>
  )
}
