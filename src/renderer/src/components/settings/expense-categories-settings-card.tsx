import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Loader2, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { useAuth } from '@/hooks/use-auth'
import type { ExpenseCategory } from '@shared/types/expense'

const categoryFormSchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  active: z.boolean()
})

type CategoryFormValues = z.infer<typeof categoryFormSchema>

const emptyValues: CategoryFormValues = { name: '', active: true }

export function ExpenseCategoriesSettingsCard() {
  const { isAdmin } = useAuth()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<ExpenseCategory | null>(null)

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: emptyValues
  })

  const categoriesQuery = useQuery({
    queryKey: ['expense-categories'],
    enabled: isAdmin,
    queryFn: async () => {
      const result = await window.api.expenseCategories.list()
      if (!result.ok) throw new Error(result.error)
      return result.data
    }
  })

  const saveMutation = useMutation({
    mutationFn: async (values: CategoryFormValues) => {
      const result = editing
        ? await window.api.expenseCategories.update(editing.id, values)
        : await window.api.expenseCategories.create(values)
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
    onSuccess: () => {
      toast.success(editing ? 'Category updated' : 'Category created')
      form.reset(emptyValues)
      setEditing(null)
      void queryClient.invalidateQueries({ queryKey: ['expense-categories'] })
    },
    onError: (error: Error) => toast.error(error.message)
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await window.api.expenseCategories.delete(id)
      if (!result.ok) throw new Error(result.error)
    },
    onSuccess: () => {
      toast.success('Category deleted')
      void queryClient.invalidateQueries({ queryKey: ['expense-categories'] })
    },
    onError: (error: Error) => toast.error(error.message)
  })

  if (!isAdmin) return null

  const categories = categoriesQuery.data ?? []

  const startEdit = (category: ExpenseCategory) => {
    setEditing(category)
    form.reset({ name: category.name, active: category.active })
  }

  const cancelEdit = () => {
    setEditing(null)
    form.reset(emptyValues)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Expense categories</CardTitle>
        <CardDescription>
          Preset categories for daily expense entries. Staff can still use custom labels.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) => void saveMutation.mutateAsync(values))}
            className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_auto_auto]"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{editing ? 'Edit category' : 'Add category'}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Category name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex items-end">
                  <div className="flex items-center gap-2 pb-2">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="!mt-0 font-normal">Active</FormLabel>
                  </div>
                </FormItem>
              )}
            />
            <div className="flex items-end gap-2">
              {editing && (
                <Button type="button" variant="outline" onClick={cancelEdit}>
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="animate-spin" />}
                {editing ? 'Update' : 'Add'}
              </Button>
            </div>
          </form>
        </Form>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell className="font-medium">{category.name}</TableCell>
                <TableCell>{category.active ? 'Active' : 'Inactive'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="icon" onClick={() => startEdit(category)}>
                      <Pencil className="size-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => void deleteMutation.mutateAsync(category.id)}
                    >
                      <Trash2 className="size-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
