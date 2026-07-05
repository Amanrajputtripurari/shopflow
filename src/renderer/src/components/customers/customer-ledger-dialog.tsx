import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { NumericInput } from '@/components/ui/numeric-input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { useAuth } from '@/hooks/use-auth'
import { formatCurrency, formatDateTime } from '@/lib/format'
import type { Customer } from '@shared/types/customer'

interface CustomerLedgerDialogProps {
  customer: Customer | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CustomerLedgerDialog({ customer, open, onOpenChange }: CustomerLedgerDialogProps) {
  const { isAdmin } = useAuth()
  const queryClient = useQueryClient()
  const [settleAmount, setSettleAmount] = useState(0)

  const ledgerQuery = useQuery({
    queryKey: ['ledger', customer?.id],
    enabled: open && Boolean(customer?.id),
    queryFn: async () => {
      const result = await window.api.ledger.list(customer!.id)
      if (!result.ok) throw new Error(result.error)
      return result.data
    }
  })

  const settle = async () => {
    if (!customer) return
    const result = await window.api.ledger.settle({
      customerId: customer.id,
      amount: settleAmount,
      note: 'Payment received'
    })
    if (result.ok) {
      toast.success('Credit settled')
      setSettleAmount(0)
      void queryClient.invalidateQueries({ queryKey: ['ledger', customer.id] })
      void queryClient.invalidateQueries({ queryKey: ['customers'] })
    } else {
      toast.error(result.error)
    }
  }

  if (!customer) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Ledger — {customer.name}</DialogTitle>
        </DialogHeader>

        <p className="text-sm">
          Outstanding credit:{' '}
          <span className="font-semibold">{formatCurrency(customer.creditBalance)}</span>
        </p>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Note</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(ledgerQuery.data ?? []).map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>{formatDateTime(entry.createdAt)}</TableCell>
                <TableCell className="uppercase">{entry.type}</TableCell>
                <TableCell>{entry.orderNo ?? '—'}</TableCell>
                <TableCell>{formatCurrency(entry.amount)}</TableCell>
                <TableCell>{entry.note}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {isAdmin && customer.creditBalance > 0 && (
          <div className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_auto]">
            <div className="space-y-2">
              <Label>Settlement amount (Admin)</Label>
              <NumericInput value={settleAmount} onNumberChange={setSettleAmount} />
            </div>
            <div className="flex items-end">
              <Button onClick={() => void settle()}>Record settlement</Button>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
