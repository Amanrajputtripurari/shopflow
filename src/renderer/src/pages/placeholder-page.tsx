import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface PlaceholderPageProps {
  title: string
  phase: string
}

export function PlaceholderPage({ title, phase }: PlaceholderPageProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          This module is planned for {phase}. Phase 0 only ships the app shell and MongoDB setup.
        </CardDescription>
      </CardHeader>
    </Card>
  )
}
