import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Eye,
  FileStack,
  Loader2,
  Plus,
  Star
} from 'lucide-react'
import { toast } from 'sonner'

import { InvoiceLayoutEditor } from '@/components/invoice-layouts/invoice-layout-editor'
import { InvoiceLayoutListCard } from '@/components/invoice-layouts/invoice-layout-list-card'
import {
  InvoiceLayoutPreviewDialog,
  layoutInputToPreviewTarget,
  layoutToPreviewTarget,
  type InvoiceLayoutPreviewTarget
} from '@/components/invoice-layouts/invoice-layout-preview-dialog'
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
import { Card, CardContent } from '@/components/ui/card'
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
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/use-auth'
import { createEmptyLayoutInput } from '@/lib/invoice-layout-utils'
import { DEFAULT_INVOICE_LAYOUT_FIELDS } from '@shared/constants/invoice-layout'
import type { InvoiceLayout, InvoiceLayoutField, InvoiceLayoutInput } from '@shared/types/invoice-layout'

type EditorMode = 'create' | 'edit'

function layoutToInput(layout: InvoiceLayout): InvoiceLayoutInput {
  return {
    name: layout.name,
    description: layout.description,
    billTypes: [...layout.billTypes],
    isDefault: layout.isDefault,
    pageWidth: layout.pageWidth,
    pageHeight: layout.pageHeight,
    margin: layout.margin,
    fields: layout.fields.map((field) => ({ ...field }))
  }
}

function createStarterLayout(): InvoiceLayoutInput {
  return {
    ...createEmptyLayoutInput('New layout'),
    fields: DEFAULT_INVOICE_LAYOUT_FIELDS.map((field) => ({ ...field, id: `${field.id}-${Date.now()}` }))
  }
}

export function InvoiceLayoutsPage() {
  const { isAdmin } = useAuth()
  const queryClient = useQueryClient()
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorMode, setEditorMode] = useState<EditorMode>('edit')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<InvoiceLayoutInput>(createStarterLayout())
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [duplicateTarget, setDuplicateTarget] = useState<InvoiceLayout | null>(null)
  const [duplicateName, setDuplicateName] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewTarget, setPreviewTarget] = useState<InvoiceLayoutPreviewTarget | null>(null)

  const layoutsQuery = useQuery({
    queryKey: ['invoice-layouts'],
    queryFn: async () => {
      const result = await window.api.invoiceLayouts.list()
      if (!result.ok) throw new Error(result.error)
      return result.data
    }
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editorMode === 'create') {
        const result = await window.api.invoiceLayouts.create(draft)
        if (!result.ok) throw new Error(result.error)
        return result.data
      }
      if (!editingId) throw new Error('Layout not selected.')
      const result = await window.api.invoiceLayouts.update(editingId, draft)
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
    onSuccess: () => {
      toast.success(editorMode === 'create' ? 'Layout created' : 'Layout saved')
      void queryClient.invalidateQueries({ queryKey: ['invoice-layouts'] })
      closeEditor()
    },
    onError: (error: Error) => toast.error(error.message)
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await window.api.invoiceLayouts.delete(id)
      if (!result.ok) throw new Error(result.error)
    },
    onSuccess: () => {
      toast.success('Layout deleted')
      setDeleteId(null)
      void queryClient.invalidateQueries({ queryKey: ['invoice-layouts'] })
    },
    onError: (error: Error) => toast.error(error.message)
  })

  const duplicateMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const result = await window.api.invoiceLayouts.duplicate(id, name)
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
    onSuccess: (layout) => {
      toast.success('Layout duplicated')
      setDuplicateTarget(null)
      setDuplicateName('')
      void queryClient.invalidateQueries({ queryKey: ['invoice-layouts'] })
      openEdit(layout)
    },
    onError: (error: Error) => toast.error(error.message)
  })

  const layouts = layoutsQuery.data ?? []
  const readOnly = !isAdmin

  const editorTitle = useMemo(() => {
    if (editorMode === 'create') return 'Create invoice layout'
    return draft.name.trim() || 'Edit invoice layout'
  }, [draft.name, editorMode])

  const openCreate = () => {
    setEditorMode('create')
    setEditingId(null)
    setDraft(createStarterLayout())
    setSelectedFieldId(null)
    setEditorOpen(true)
  }

  const openEdit = (layout: InvoiceLayout) => {
    setEditorMode('edit')
    setEditingId(layout.id)
    setDraft(layoutToInput(layout))
    setSelectedFieldId(null)
    setEditorOpen(true)
  }

  const closeEditor = () => {
    setEditorOpen(false)
    setEditingId(null)
    setSelectedFieldId(null)
  }

  const updateField = (id: string, patch: Partial<InvoiceLayoutField>) => {
    setDraft((current) => ({
      ...current,
      fields: current.fields.map((field) => (field.id === id ? { ...field, ...patch } : field))
    }))
  }

  const deleteField = (id: string) => {
    setDraft((current) => ({
      ...current,
      fields: current.fields.filter((field) => field.id !== id)
    }))
    if (selectedFieldId === id) setSelectedFieldId(null)
  }

  const addField = (field: InvoiceLayoutField) => {
    setDraft((current) => ({ ...current, fields: [...current.fields, field] }))
    setSelectedFieldId(field.id)
  }

  const openPreview = (target: InvoiceLayoutPreviewTarget) => {
    setPreviewTarget(target)
    setPreviewOpen(true)
  }

  const previewDialog = (
    <InvoiceLayoutPreviewDialog
      open={previewOpen}
      onOpenChange={setPreviewOpen}
      layout={previewTarget}
    />
  )

  useEffect(() => {
    if (!editorOpen || readOnly || !selectedFieldId) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Delete' && event.key !== 'Backspace') return
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return
      }
      event.preventDefault()
      deleteField(selectedFieldId)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [editorOpen, readOnly, selectedFieldId])

  if (editorOpen) {
    return (
      <div className="-m-6 flex h-[calc(100dvh-4rem)] min-h-0 flex-col overflow-hidden">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b bg-card px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Button type="button" variant="outline" size="sm" className="gap-2 shrink-0" onClick={closeEditor}>
              <ArrowLeft className="size-4" />
              Back
            </Button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-lg font-semibold tracking-tight">{editorTitle}</h2>
                {draft.isDefault && (
                  <Badge variant="secondary" className="gap-1">
                    <Star className="size-3 fill-current" />
                    Default
                  </Badge>
                )}
                <Badge variant="outline">{draft.fields.length} fields</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {readOnly
                  ? 'View-only mode.'
                  : 'Design your bill PDF — drag, resize, and configure fields.'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => openPreview(layoutInputToPreviewTarget(draft))}
            >
              <Eye className="size-4" />
              Preview
            </Button>
            {!readOnly && (
              <>
                <Button type="button" variant="outline" onClick={closeEditor}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={saveMutation.isPending || !draft.name.trim()}
                  onClick={() => saveMutation.mutate()}
                >
                  {saveMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                  {editorMode === 'create' ? 'Create layout' : 'Save changes'}
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden p-4">
          <InvoiceLayoutEditor
            draft={draft}
            selectedFieldId={selectedFieldId}
            readOnly={readOnly}
            onDraftChange={setDraft}
            onSelectField={setSelectedFieldId}
            onUpdateField={updateField}
            onDeleteField={deleteField}
            onAddField={addField}
          />
        </div>
        {previewDialog}
      </div>
    )
  }

  return (
    <div className="-m-6 flex h-[calc(100dvh-4rem)] min-h-0 flex-col overflow-hidden">
      <div className="shrink-0 space-y-4 border-b bg-background px-6 py-4">
        <PageHeader
          title="Invoice layouts"
          description="Design how your PDF bills look. Create multiple layouts for simple and GST invoices."
          actions={
            isAdmin ? (
              <Button type="button" className="gap-2" onClick={openCreate}>
                <Plus className="size-4" />
                New layout
              </Button>
            ) : undefined
          }
        />

        {!layoutsQuery.isLoading && layouts.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="border-dashed shadow-none">
              <CardContent className="flex h-full flex-col justify-center gap-1 p-4">
                <p className="text-sm text-muted-foreground">Total layouts</p>
                <p className="text-2xl font-semibold tabular-nums">{layouts.length}</p>
              </CardContent>
            </Card>
            <Card className="border-dashed shadow-none sm:col-span-2">
              <CardContent className="flex h-full flex-col justify-center gap-1 p-4">
                <p className="text-sm text-muted-foreground">Default for billing</p>
                <p className="truncate text-lg font-medium">
                  {layouts.find((layout) => layout.isDefault)?.name ?? 'None set'}
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-6 py-4">
        {layoutsQuery.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-44 rounded-xl" />
            ))}
          </div>
        ) : layouts.length === 0 ? (
          <EmptyState
            icon={FileStack}
            title="No invoice layouts yet"
            description="Create your first layout to customize bill PDFs with your branding and field placement."
            action={
              isAdmin ? (
                <Button type="button" className="gap-2" onClick={openCreate}>
                  <Plus className="size-4" />
                  Create layout
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {layouts.map((layout) => (
              <InvoiceLayoutListCard
                key={layout.id}
                layout={layout}
                isAdmin={isAdmin}
                onEdit={openEdit}
                onDuplicate={(item) => {
                  setDuplicateTarget(item)
                  setDuplicateName(`${item.name} copy`)
                }}
                onDelete={(item) => setDeleteId(item.id)}
                onPreview={(item) => openPreview(layoutToPreviewTarget(item))}
              />
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete invoice layout?</AlertDialogTitle>
            <AlertDialogDescription>
              This layout will be removed permanently. Bills will fall back to another layout or the built-in format.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={Boolean(duplicateTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDuplicateTarget(null)
            setDuplicateName('')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate layout</DialogTitle>
            <DialogDescription>Create a copy of “{duplicateTarget?.name}” with a new name.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="duplicate-name">Layout name</Label>
            <Input
              id="duplicate-name"
              value={duplicateName}
              onChange={(event) => setDuplicateName(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDuplicateTarget(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!duplicateName.trim() || duplicateMutation.isPending}
              onClick={() =>
                duplicateTarget &&
                duplicateMutation.mutate({ id: duplicateTarget.id, name: duplicateName.trim() })
              }
            >
              {duplicateMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              Duplicate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {previewDialog}
    </div>
  )
}
