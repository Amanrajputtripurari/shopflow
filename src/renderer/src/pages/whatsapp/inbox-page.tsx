import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/use-auth'
import { formatDateTime } from '@/lib/format'
import type { Conversation } from '@shared/types/whatsapp'

export function InboxPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [reply, setReply] = useState('')

  const inboxQuery = useQuery({
    queryKey: ['whatsapp-inbox'],
    queryFn: async () => {
      const result = await window.api.whatsapp.inboxList()
      if (!result.ok) throw new Error(result.error)
      return result.data
    }
  })

  useEffect(() => {
    return window.api.whatsapp.onInboxUpdated(() => {
      void queryClient.invalidateQueries({ queryKey: ['whatsapp-inbox'] })
      if (selectedId) {
        void queryClient.invalidateQueries({ queryKey: ['whatsapp-messages', selectedId] })
      }
    })
  }, [queryClient, selectedId])

  const messagesQuery = useQuery({
    queryKey: ['whatsapp-messages', selectedId],
    enabled: Boolean(selectedId),
    queryFn: async () => {
      const result = await window.api.whatsapp.messagesList(selectedId!)
      if (!result.ok) throw new Error(result.error)
      return result.data
    }
  })

  const replyMutation = useMutation({
    mutationFn: async () => {
      if (!selectedId) throw new Error('Select a conversation first.')
      const result = await window.api.whatsapp.reply({ conversationId: selectedId, body: reply })
      if (!result.ok) throw new Error(result.error)
    },
    onSuccess: () => {
      setReply('')
      toast.success('Reply queued')
      void queryClient.invalidateQueries({ queryKey: ['whatsapp-messages', selectedId] })
      void queryClient.invalidateQueries({ queryKey: ['whatsapp-inbox'] })
    },
    onError: (error: Error) => toast.error(error.message)
  })

  const assignMutation = useMutation({
    mutationFn: async (conversation: Conversation) => {
      const result = await window.api.whatsapp.assign({
        conversationId: conversation.id,
        userId: conversation.assignedTo ? null : user?.id
      })
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['whatsapp-inbox'] })
    },
    onError: (error: Error) => toast.error(error.message)
  })

  const conversations = inboxQuery.data ?? []
  const selected = conversations.find((entry) => entry.id === selectedId) ?? null

  return (
    <div className="space-y-6">
      <PageHeader title="WhatsApp Inbox" description="Multi-customer conversations sorted by priority." />

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="min-h-[520px]">
          <CardHeader>
            <CardTitle className="text-base">Conversations</CardTitle>
            <CardDescription>{conversations.length} threads</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {inboxQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : conversations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No conversations yet.</p>
            ) : (
              conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => setSelectedId(conversation.id)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    selectedId === conversation.id ? 'border-primary bg-muted/40' : 'hover:bg-muted/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{conversation.customerName ?? conversation.phone}</p>
                      <p className="text-xs text-muted-foreground">+{conversation.phone}</p>
                    </div>
                    {conversation.unreadCount > 0 && (
                      <Badge>{conversation.unreadCount}</Badge>
                    )}
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                    {conversation.lastMessagePreview}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {conversation.status}
                    </Badge>
                    {conversation.assignedToName && (
                      <Badge variant="secondary" className="text-[10px]">
                        {conversation.assignedToName}
                      </Badge>
                    )}
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="flex min-h-[520px] flex-col">
          <CardHeader>
            <CardTitle className="text-base">
              {selected ? selected.customerName ?? `+${selected.phone}` : 'Select a conversation'}
            </CardTitle>
            {selected && (
              <CardDescription>
                {selected.lockedByName && selected.lockedBy !== user?.id
                  ? `${selected.lockedByName} is replying`
                  : 'Reply or assign this thread'}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
            {selected && (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void assignMutation.mutateAsync(selected)}
                >
                  {selected.assignedTo ? 'Unassign' : 'Assign to me'}
                </Button>
              </div>
            )}

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-lg border p-3">
              {(messagesQuery.data ?? []).map((message) => (
                <div
                  key={message.id}
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    message.direction === 'outbound'
                      ? 'ml-auto bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p>{message.body}</p>
                  <p className="mt-1 text-[10px] opacity-70">{formatDateTime(message.createdAt)}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder={selected ? 'Type a reply…' : 'Select a conversation'}
                disabled={!selected}
                rows={3}
              />
              <Button
                disabled={!selected || !reply.trim() || replyMutation.isPending}
                onClick={() => void replyMutation.mutateAsync()}
              >
                {replyMutation.isPending ? <Loader2 className="animate-spin" /> : <Check className="size-4" />}
                Send
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
