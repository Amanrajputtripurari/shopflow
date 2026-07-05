import { ObjectId } from 'mongodb'

import { COLLECTIONS } from '@shared/constants/database'
import type { AuthUser, CreateUserInput, UserDocument, UserListItem } from '@shared/types/auth'
import { BaseRepository } from './base.repository'
import { hashPassword } from '../helpers/password'

function toListItem(document: UserDocument): UserListItem {
  return {
    id: document._id.toString(),
    username: document.username,
    displayName: document.displayName,
    role: document.role,
    active: document.active,
    createdAt: document.createdAt.toISOString()
  }
}

function toAuthUser(document: UserDocument): AuthUser {
  return {
    id: document._id.toString(),
    username: document.username,
    displayName: document.displayName,
    role: document.role
  }
}

export class UsersRepository extends BaseRepository<UserDocument> {
  constructor() {
    super(COLLECTIONS.USERS)
  }

  async findByUsername(username: string): Promise<UserDocument | null> {
    return this.findOne({ username: username.trim().toLowerCase() })
  }

  async findById(id: string): Promise<UserDocument | null> {
    if (!ObjectId.isValid(id)) return null
    return this.findOne({ _id: new ObjectId(id) })
  }

  async list(): Promise<UserListItem[]> {
    const documents = await this.findMany({}, { createdAt: -1 })
    return documents.map(toListItem)
  }

  async create(input: CreateUserInput): Promise<UserListItem> {
    const now = new Date()
    const document: UserDocument = {
      _id: new ObjectId(),
      username: input.username.trim().toLowerCase(),
      passwordHash: await hashPassword(input.password),
      displayName: input.displayName.trim(),
      role: input.role,
      active: true,
      createdAt: now,
      updatedAt: now
    }

    await this.insertOne(document)
    return toListItem(document)
  }

  toAuthUser(document: UserDocument): AuthUser {
    return toAuthUser(document)
  }
}

export const usersRepository = new UsersRepository()
