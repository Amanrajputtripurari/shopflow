import type { AuthUser } from '@shared/types/auth'

const TOKEN_KEY = 'shopflow:session-token'
const USER_KEY = 'shopflow:session-user'

export function getStoredToken(): string | null {
  return window.localStorage.getItem(TOKEN_KEY)
}

export function getStoredUser(): AuthUser | null {
  const raw = window.localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

export function persistSession(token: string, user: AuthUser): void {
  window.localStorage.setItem(TOKEN_KEY, token)
  window.localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearSession(): void {
  window.localStorage.removeItem(TOKEN_KEY)
  window.localStorage.removeItem(USER_KEY)
}

export async function restoreSession(): Promise<AuthUser | null> {
  const token = getStoredToken()
  if (!token) return null

  const result = await window.api.auth.restoreSession(token)
  if (!result.ok) {
    clearSession()
    return null
  }

  persistSession(token, result.data)
  return result.data
}

export async function logout(): Promise<void> {
  await window.api.auth.logout()
  clearSession()
}

export function isAuthenticated(): boolean {
  return Boolean(getStoredToken())
}
