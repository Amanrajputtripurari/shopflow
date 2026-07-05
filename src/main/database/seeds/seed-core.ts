import { SEED_COMPANY, SEED_SETTINGS } from '@shared/constants/seed-data'
import { companyRepository } from '../../repositories/company.repository'
import { settingsRepository } from '../../repositories/settings.repository'
import { runMigrations } from '../index-manager'

export async function seedCore(): Promise<void> {
  await runMigrations()

  await settingsRepository.saveSettings(SEED_SETTINGS)
  await companyRepository.saveProfile(SEED_COMPANY)

  console.log('✓ Core seed complete (migrations, settings, company)')
  console.log(`  Company: ${SEED_COMPANY.name}`)
}
