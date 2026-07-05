import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { useAuth } from '@/hooks/use-auth'
import { formatDateTime } from '@/lib/format'

export function WhatsAppQueueSettingsCard() {
  const { isAdmin } = useAuth()
  const queryClient = useQueryClient()

  const queueQuery = useQuery({
    queryKey: ['whatsapp-queue'],
    enabled: isAdmin,
    queryFn: async () => {
      const result = await window.api.whatsapp.queueList()
      if (!result.ok) throw new Error(result.error)
      return result.data
    }
  })

  const approveMutation = useMutation({
    mutationFn: async (queueId: string) => {
      const result = await window.api.whatsapp.queueApprove({ queueId })
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
    onSuccess: () => {
      toast.success('Message approved')
      void queryClient.invalidateQueries({ queryKey: ['whatsapp-queue'] })
    },
    onError: (error: Error) => toast.error(error.message)
  })

  if (!isAdmin) return null

  const pending = queueQuery.data ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">WhatsApp approval queue</CardTitle>
        <CardDescription>Credit reminders and bulk sends require admin approval before delivery.</CardDescription>
      </CardHeader>
      <CardContent>
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">No messages waiting for approval.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Queued</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="capitalize">{item.type}</TableCell>
                  <TableCell>+{item.phone}</TableCell>
                  <TableCell className="max-w-[240px] truncate">{item.body}</TableCell>
                  <TableCell>{formatDateTime(item.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      disabled={approveMutation.isPending}
                      onClick={() => void approveMutation.mutateAsync(item.id)}
                    >
                      {approveMutation.isPending ? <Loader2 className="animate-spin" /> : <Check className="size-4" />}
                      Approve
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
