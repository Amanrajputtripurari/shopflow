import {
  Minus,
  Rows3,
  Sigma,
  Text,
  Variable,
  type LucideIcon
} from 'lucide-react'

import type { InvoiceLayoutFieldType } from '@shared/types/invoice-layout'

export interface InvoiceLayoutFieldMeta {
  label: string
  shortLabel: string
  icon: LucideIcon
  badgeClass: string
}

export const INVOICE_FIELD_META: Record<InvoiceLayoutFieldType, InvoiceLayoutFieldMeta> = {
  text: {
    label: 'Text block',
    shortLabel: 'Text',
    icon: Text,
    badgeClass: 'bg-sky-500/15 text-sky-700 dark:text-sky-300'
  },
  variable: {
    label: 'Variable',
    shortLabel: 'Var',
    icon: Variable,
    badgeClass: 'bg-violet-500/15 text-violet-700 dark:text-violet-300'
  },
  line_items: {
    label: 'Line items',
    shortLabel: 'Items',
    icon: Rows3,
    badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
  },
  totals: {
    label: 'Totals',
    shortLabel: 'Totals',
    icon: Sigma,
    badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
  },
  divider: {
    label: 'Divider',
    shortLabel: 'Line',
    icon: Minus,
    badgeClass: 'bg-slate-500/15 text-slate-700 dark:text-slate-300'
  }
}

export const INVOICE_FIELD_TYPES = Object.keys(INVOICE_FIELD_META) as InvoiceLayoutFieldType[]
