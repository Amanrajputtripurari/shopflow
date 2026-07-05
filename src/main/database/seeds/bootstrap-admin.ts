import { DEFAULT_ADMIN } from '@shared/constants/database'
import type { CreateUserInput } from '@shared/types/auth'
import { hashPassword } from '../../helpers/password'
import { usersRepository } from '../../repositories/users.repository'

export async function bootstrapAdminUser(input: CreateUserInput): Promise<void> {
  const username = input.username.trim().toLowerCase()
  if (!username) {
    throw new Error('Admin username is required.')
  }
  if (!input.password.trim()) {
    throw new Error('Admin password is required.')
  }
  if (!input.displayName.trim()) {
    throw new Error('Admin display name is required.')
  }

  const existing = await usersRepository.findByUsername(username)
  if (existing) {
    const passwordHash = await hashPassword(input.password)
    await usersRepository.replaceOne(
      { _id: existing._id },
      {
        ...existing,
        passwordHash,
        displayName: input.displayName.trim(),
        role: 'admin',
        active: true,
        updatedAt: new Date()
      }
    )
    return
  }

  const defaultAdmin = await usersRepository.findByUsername(DEFAULT_ADMIN.username)
  if (defaultAdmin) {
    await usersRepository.deleteOne({ _id: defaultAdmin._id })
  }

  await usersRepository.create({
    username: input.username,
    password: input.password,
    displayName: input.displayName,
    role: 'admin'
  })
}
