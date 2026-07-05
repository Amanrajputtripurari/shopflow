import type { AuthSession, AuthUser, CreateUserInput, LoginInput, UserListItem } from '@shared/types/auth'
import { verifyPassword } from '../helpers/password'
import { clearSession, createSessionToken, getSessionUser, storeSession } from '../helpers/session-store'
import { usersRepository } from '../repositories/users.repository'

export class AuthService {
  async login(input: LoginInput): Promise<AuthSession> {
    const username = input.username.trim().toLowerCase()
    const document = await usersRepository.findByUsername(username)

    if (!document || !document.active) {
      throw new Error('Invalid username or password.')
    }

    const valid = await verifyPassword(input.password, document.passwordHash)
    if (!valid) {
      throw new Error('Invalid username or password.')
    }

    const user = usersRepository.toAuthUser(document)
    const token = createSessionToken()
    storeSession(token, user)

    return { token, user }
  }

  logout(token: string | null | undefined): void {
    clearSession(token)
  }

  me(token: string | null | undefined): AuthUser {
    const user = getSessionUser(token)
    if (!user) {
      throw new Error('Your session has expired. Please sign in again.')
    }
    return user
  }

  async listUsers(): Promise<UserListItem[]> {
    return usersRepository.list()
  }

  async createUser(input: CreateUserInput): Promise<UserListItem> {
    if (input.password.length < 4) {
      throw new Error('Password must be at least 4 characters.')
    }

    const existing = await usersRepository.findByUsername(input.username)
    if (existing) {
      throw new Error('Username is already taken.')
    }

    return usersRepository.create(input)
  }
}

export const authService = new AuthService()
