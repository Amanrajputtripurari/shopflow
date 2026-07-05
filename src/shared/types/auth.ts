export type UserRole = 'admin' | 'staff'

export interface AuthUser {
  id: string
  username: string
  displayName: string
  role: UserRole
}

export interface AuthSession {
  token: string
  user: AuthUser
}

export interface LoginInput {
  username: string
  password: string
}

export interface CreateUserInput {
  username: string
  password: string
  displayName: string
  role: UserRole
}

export interface UserListItem {
  id: string
  username: string
  displayName: string
  role: UserRole
  active: boolean
  createdAt: string
}

export interface UserDocument {
  _id: import('mongodb').ObjectId
  username: string
  passwordHash: string
  displayName: string
  role: UserRole
  active: boolean
  createdAt: Date
  updatedAt: Date
}
