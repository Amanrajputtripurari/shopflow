import type { AuthUser } from '@shared/types/auth'

interface SessionRecord {
  user: AuthUser
  createdAt: number
}

const sessions = new Map<string, SessionRecord>()

export function createSessionToken(): string {
  return randomToken()
}

function randomToken(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
}

export function storeSession(token: string, user: AuthUser): void {
  sessions.set(token, { user, createdAt: Date.now() })
}

export function getSessionUser(token: string | null | undefined): AuthUser | null {
  if (!token) return null
  return sessions.get(token)?.user ?? null
}

export function clearAllSessions(): void {
  sessions.clear()
}

export function clearSession(token: string | null | undefined): void {
  if (!token) return
  sessions.delete(token)
}

export function requireSessionUser(token: string | null | undefined): AuthUser {
  const user = getSessionUser(token)
  if (!user) {
    throw new Error('Your session has expired. Please sign in again.')
  }
  return user
}

export function requireAdmin(token: string | null | undefined): AuthUser {
  const user = requireSessionUser(token)
  if (user.role !== 'admin') {
    throw new Error('Only administrators can perform this action.')
  }
  return user
}
