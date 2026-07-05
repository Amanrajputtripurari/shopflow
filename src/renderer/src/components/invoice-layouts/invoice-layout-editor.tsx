import { useEffect, useMemo, useState } from 'react'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Eye,
  EyeOff,
  Layers3,
  LayoutTemplate,
  Search,
  Settings2,
  Trash2
} from 'lucide-react'

import { InvoiceLayoutCanvas } from '@/components/invoice-layouts/invoice-layout-canvas'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NumericInput } from '@/components/ui/numeric-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { INVOICE_FIELD_META, INVOICE_FIELD_TYPES } from '@/lib/invoice-layout-field-meta'
import { createDefaultField } from '@/lib/invoice-layout-utils'
import { cn } from '@/lib/utils'
import { INVOICE_LAYOUT_VARIABLES } from '@shared/constants/invoice-layout'
import type { InvoiceLayoutField, InvoiceLayoutFieldType, InvoiceLayoutInput } from '@shared/types/invoice-layout'
import type { BillType } from '@shared/types/order'

interface InvoiceLayoutEditorProps {
  draft: InvoiceLayoutInput
  selectedFieldId: string | null
  readOnly?: boolean
  onDraftChange: (next: InvoiceLayoutInput) => void
  onSelectField: (id: string | null) => void
  onUpdateField: (id: string, patch: Partial<InvoiceLayoutField>) => void
  onDeleteField: (id: string) => void
  onAddField: (field: InvoiceLayoutField) => void
}

function groupVariables() {
  const groups = new Map<string, typeof INVOICE_LAYOUT_VARIABLES>()
  for (const variable of INVOICE_LAYOUT_VARIABLES) {
    const list = groups.get(variable.group) ?? []
    list.push(variable)
    groups.set(variable.group, list)
  }
  return groups
}

export function InvoiceLayoutEditor({
  draft,
  selectedFieldId,
  readOnly = false,
  onDraftChange,
  onSelectField,
  onUpdateField,
  onDeleteField,
  onAddField
}: InvoiceLayoutEditorProps) {
  const [variableSearch, setVariableSearch] = useState('')
  const [rightTab, setRightTab] = useState('layout')
  const selectedField = draft.fields.find((field) => field.id === selectedFieldId) ?? null
  const variableGroups = useMemo(() => groupVariables(), [])

  const sortedLayers = useMemo(
    () => [...draft.fields].sort((a, b) => a.y - b.y || a.x - b.x),
    [draft.fields]
  )

  const filteredVariableGroups = useMemo(() => {
    const term = variableSearch.trim().toLowerCase()
    if (!term) return variableGroups

    const filtered = new Map<string, typeof INVOICE_LAYOUT_VARIABLES>()
    for (const [group, variables] of variableGroups.entries()) {
      const matches = variables.filter(
        (variable) =>
          variable.label.toLowerCase().includes(term) || variable.key.toLowerCase().includes(term)
      )
      if (matches.length) filtered.set(group, matches)
    }
    return filtered
  }, [variableGroups, variableSearch])

  const addField = (type: InvoiceLayoutFieldType) => {
    const maxY = draft.fields.reduce((max, field) => Math.max(max, field.y + field.height), draft.margin ?? 50)
    onAddField(createDefaultField(type, maxY + 12))
  }

  const insertVariable = (key: string, label: string) => {
    if (selectedField && (selectedField.type === 'text' || selectedField.type === 'variable')) {
      if (selectedField.type === 'variable') {
        onUpdateField(selectedField.id, { content: key, label })
      } else {
        onUpdateField(selectedField.id, {
          content: `${selectedField.content}${selectedField.content ? '\n' : ''}{${key}}`
        })
      }
      return
    }

    onAddField({
      ...createDefaultField('variable'),
      content: key,
      label
    })
  }

  const toggleBillType = (billType: BillType) => {
    const has = draft.billTypes.includes(billType)
    const next = has ? draft.billTypes.filter((item) => item !== billType) : [...draft.billTypes, billType]
    onDraftChange({ ...draft, billTypes: next.length ? next : [billType] })
  }

  useEffect(() => {
    if (selectedFieldId) setRightTab('field')
  }, [selectedFieldId])

  return (
    <div className="grid h-full min-h-0 flex-1 gap-3 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
      <aside className="flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
        <Tabs defaultValue="blocks" className="flex min-h-0 flex-1 flex-col">
          <TabsList className="mx-3 mt-3 grid w-auto grid-cols-3">
            <TabsTrigger value="blocks" className="gap-1 text-xs">
              <LayoutTemplate className="size-3.5" />
              Blocks
            </TabsTrigger>
            <TabsTrigger value="variables" className="gap-1 text-xs">
              <Search className="size-3.5" />
              Vars
            </TabsTrigger>
            <TabsTrigger value="layers" className="gap-1 text-xs">
              <Layers3 className="size-3.5" />
              Layers
            </TabsTrigger>
          </TabsList>

          <TabsContent value="blocks" className="mt-0 min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-3">
            <div className="grid grid-cols-2 gap-2">
              {INVOICE_FIELD_TYPES.map((type) => {
                const meta = INVOICE_FIELD_META[type]
                const Icon = meta.icon
                return (
                  <button
                    key={type}
                    type="button"
                    disabled={readOnly}
                    onClick={() => addField(type)}
                    className="flex flex-col items-start gap-2 rounded-lg border bg-background p-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/40 disabled:opacity-60"
                  >
                    <span className={cn('rounded-md p-1.5', meta.badgeClass)}>
                      <Icon className="size-4" />
                    </span>
                    <span>
                      <span className="block text-sm font-medium">{meta.label}</span>
                      <span className="block text-[11px] text-muted-foreground">Click to add</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </TabsContent>

          <TabsContent value="variables" className="mt-0 min-h-0 flex-1 overflow-hidden px-3 pb-3 pt-3">
            <div className="flex h-full min-h-0 flex-col gap-3">
              <Input
                value={variableSearch}
                onChange={(event) => setVariableSearch(event.target.value)}
                placeholder="Search variables…"
                className="h-8"
              />
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
                {[...filteredVariableGroups.entries()].map(([group, variables]) => (
                  <div key={group}>
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {group}
                    </p>
                    <div className="space-y-1">
                      {variables.map((variable) => (
                        <button
                          key={variable.key}
                          type="button"
                          disabled={readOnly}
                          className="flex w-full items-center justify-between rounded-md border bg-background px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted/60 disabled:opacity-60"
                          onClick={() => insertVariable(variable.key, variable.label)}
                        >
                          <span>{variable.label}</span>
                          <code className="text-[10px] text-muted-foreground">{variable.key}</code>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="layers" className="mt-0 min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-3">
            <div className="space-y-1">
              {sortedLayers.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No fields yet. Add blocks from the Blocks tab.</p>
              ) : (
                sortedLayers.map((field) => {
                  const meta = INVOICE_FIELD_META[field.type]
                  const Icon = meta.icon
                  const active = field.id === selectedFieldId
                  return (
                    <div
                      key={field.id}
                      className={cn(
                        'flex items-center gap-2 rounded-lg border px-2 py-1.5',
                        active ? 'border-primary bg-primary/5' : 'bg-background'
                      )}
                    >
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        onClick={() => onSelectField(field.id)}
                      >
                        <span className={cn('rounded p-1', meta.badgeClass)}>
                          <Icon className="size-3.5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{field.label}</span>
                          <span className="block text-[10px] text-muted-foreground">
                            {meta.shortLabel} · y{field.y}
                          </span>
                        </span>
                      </button>
                      {!readOnly && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7 shrink-0"
                          onClick={() => onUpdateField(field.id, { visible: !field.visible })}
                        >
                          {field.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                          <span className="sr-only">Toggle visibility</span>
                        </Button>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </TabsContent>
        </Tabs>
      </aside>

      <section className="flex min-h-0 min-w-0 flex-1 flex-col">
        <InvoiceLayoutCanvas
          pageWidth={draft.pageWidth ?? 595}
          pageHeight={draft.pageHeight ?? 842}
          margin={draft.margin ?? 50}
          fields={draft.fields}
          selectedFieldId={selectedFieldId}
          readOnly={readOnly}
          onSelectField={onSelectField}
          onUpdateField={onUpdateField}
        />
      </section>

      <aside className="flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
        <Tabs value={rightTab} onValueChange={setRightTab} className="flex min-h-0 flex-1 flex-col">
          <TabsList className="mx-3 mt-3 grid w-auto grid-cols-2">
            <TabsTrigger value="layout" className="gap-1 text-xs">
              <Settings2 className="size-3.5" />
              Layout
            </TabsTrigger>
            <TabsTrigger value="field" className="gap-1 text-xs" disabled={!selectedField}>
              Field
            </TabsTrigger>
          </TabsList>

          <TabsContent value="layout" className="mt-0 min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-3">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="layout-name">Name</Label>
                <Input
                  id="layout-name"
                  value={draft.name}
                  disabled={readOnly}
                  onChange={(event) => onDraftChange({ ...draft, name: event.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="layout-description">Description</Label>
                <Textarea
                  id="layout-description"
                  rows={2}
                  value={draft.description ?? ''}
                  disabled={readOnly}
                  onChange={(event) => onDraftChange({ ...draft, description: event.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Bill types</Label>
                <div className="flex flex-wrap gap-2">
                  {(['simple', 'gst'] as BillType[]).map((billType) => {
                    const active = draft.billTypes.includes(billType)
                    return (
                      <Button
                        key={billType}
                        type="button"
                        size="sm"
                        variant={active ? 'default' : 'outline'}
                        disabled={readOnly}
                        onClick={() => toggleBillType(billType)}
                      >
                        {billType === 'gst' ? 'GST invoice' : 'Simple bill'}
                      </Button>
                    )
                  })}
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
                <div>
                  <Label htmlFor="layout-default">Default layout</Label>
                  <p className="text-[11px] text-muted-foreground">Used when generating PDF bills</p>
                </div>
                <Switch
                  id="layout-default"
                  checked={draft.isDefault ?? false}
                  disabled={readOnly}
                  onCheckedChange={(checked) => onDraftChange({ ...draft, isDefault: checked })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="layout-margin">Margin (pt)</Label>
                  <NumericInput
                    id="layout-margin"
                    min={0}
                    integerOnly
                    value={draft.margin ?? 50}
                    disabled={readOnly}
                    onNumberChange={(value) => onDraftChange({ ...draft, margin: value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Page size</Label>
                  <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    A4 · {draft.pageWidth ?? 595} × {draft.pageHeight ?? 842}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{draft.fields.length} fields</Badge>
                <Badge variant="outline">{draft.fields.filter((field) => field.visible).length} visible</Badge>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="field" className="mt-0 min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-3">
            {!selectedField ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Select a field on the canvas or from Layers.</p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className={INVOICE_FIELD_META[selectedField.type].badgeClass}>
                    {INVOICE_FIELD_META[selectedField.type].label}
                  </Badge>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="field-label">Label</Label>
                  <Input
                    id="field-label"
                    value={selectedField.label}
                    disabled={readOnly}
                    onChange={(event) => onUpdateField(selectedField.id, { label: event.target.value })}
                  />
                </div>

                {selectedField.type === 'variable' && (
                  <div className="space-y-1.5">
                    <Label>Variable</Label>
                    <Select
                      value={selectedField.content}
                      disabled={readOnly}
                      onValueChange={(value) => {
                        const variable = INVOICE_LAYOUT_VARIABLES.find((item) => item.key === value)
                        onUpdateField(selectedField.id, {
                          content: value,
                          label: variable?.label ?? selectedField.label
                        })
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {INVOICE_LAYOUT_VARIABLES.map((variable) => (
                          <SelectItem key={variable.key} value={variable.key}>
                            {variable.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {selectedField.type === 'text' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="field-content">Content</Label>
                    <Textarea
                      id="field-content"
                      rows={4}
                      value={selectedField.content}
                      disabled={readOnly}
                      onChange={(event) => onUpdateField(selectedField.id, { content: event.target.value })}
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {(['x', 'y', 'width', 'height'] as const).map((key) => (
                    <div key={key} className="space-y-1.5">
                      <Label htmlFor={`field-${key}`} className="capitalize">
                        {key}
                      </Label>
                      <NumericInput
                        id={`field-${key}`}
                        min={key === 'width' ? 24 : key === 'height' ? 12 : 0}
                        integerOnly
                        value={selectedField[key]}
                        disabled={readOnly}
                        onNumberChange={(value) => onUpdateField(selectedField.id, { [key]: value })}
                      />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="field-font-size">Font size</Label>
                    <NumericInput
                      id="field-font-size"
                      min={6}
                      max={48}
                      integerOnly
                      value={selectedField.fontSize}
                      disabled={readOnly || selectedField.type === 'line_items' || selectedField.type === 'totals'}
                      onNumberChange={(value) => onUpdateField(selectedField.id, { fontSize: value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Weight</Label>
                    <Select
                      value={selectedField.fontWeight}
                      disabled={readOnly}
                      onValueChange={(value: 'normal' | 'bold') =>
                        onUpdateField(selectedField.id, { fontWeight: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="bold">Bold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Alignment</Label>
                  <div className="flex gap-1">
                    {([
                      ['left', AlignLeft],
                      ['center', AlignCenter],
                      ['right', AlignRight]
                    ] as const).map(([align, Icon]) => (
                      <Button
                        key={align}
                        type="button"
                        size="icon"
                        variant={selectedField.align === align ? 'default' : 'outline'}
                        disabled={readOnly}
                        onClick={() => onUpdateField(selectedField.id, { align })}
                      >
                        <Icon className="size-4" />
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
                  <Label htmlFor="field-visible">Visible on invoice</Label>
                  <Switch
                    id="field-visible"
                    checked={selectedField.visible}
                    disabled={readOnly}
                    onCheckedChange={(checked) => onUpdateField(selectedField.id, { visible: checked })}
                  />
                </div>

                <Separator />

                <Button
                  type="button"
                  variant="destructive"
                  className="w-full gap-2"
                  disabled={readOnly}
                  onClick={() => onDeleteField(selectedField.id)}
                >
                  <Trash2 className="size-4" />
                  Remove field
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </aside>
    </div>
  )
}
