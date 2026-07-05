import { DEFAULT_ADMIN } from '@shared/constants/database'
import { SEED_STAFF } from '@shared/constants/seed-data'
import { hashPassword } from '../../helpers/password'
import { usersRepository } from '../../repositories/users.repository'
import { runMigrations } from '../index-manager'

export async function seedUsers(): Promise<void> {
  await runMigrations()

  const admin = await usersRepository.findByUsername(DEFAULT_ADMIN.username)
  if (admin) {
    console.log(`✓ Admin already exists (${DEFAULT_ADMIN.username})`)
  } else {
    console.log('  Admin will be created on next migration run')
  }

  const staff = await usersRepository.findByUsername(SEED_STAFF.username)
  if (staff) {
    console.log(`✓ Staff already exists (${SEED_STAFF.username})`)
    return
  }

  await usersRepository.create({
    username: SEED_STAFF.username,
    password: SEED_STAFF.password,
    displayName: SEED_STAFF.displayName,
    role: SEED_STAFF.role
  })

  console.log('✓ Staff user created')
  console.log(`  username: ${SEED_STAFF.username}`)
  console.log(`  password: ${SEED_STAFF.password}`)
}

export async function printLoginCredentials(): Promise<void> {
  const adminExists = await usersRepository.findByUsername(DEFAULT_ADMIN.username)
  const staffExists = await usersRepository.findByUsername(SEED_STAFF.username)

  console.log('\nLogin credentials:')
  if (adminExists) {
    console.log(`  Admin → ${DEFAULT_ADMIN.username} / ${DEFAULT_ADMIN.password}`)
  }
  if (staffExists) {
    console.log(`  Staff → ${SEED_STAFF.username} / ${SEED_STAFF.password}`)
  }
}

/** Dev-only: reset admin password to default if user exists */
export async function resetAdminPassword(): Promise<void> {
  const admin = await usersRepository.findByUsername(DEFAULT_ADMIN.username)
  if (!admin) {
    console.log('  Admin user not found — run seed:core first')
    return
  }

  const passwordHash = await hashPassword(DEFAULT_ADMIN.password)
  const updated = {
    ...admin,
    passwordHash,
    active: true,
    updatedAt: new Date()
  }

  await usersRepository.replaceOne({ _id: admin._id }, updated)
  console.log(`✓ Admin password reset to "${DEFAULT_ADMIN.password}"`)
}
