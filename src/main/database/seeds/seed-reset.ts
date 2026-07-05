import { COLLECTIONS } from '@shared/constants/database'
import { getDb } from '../connection'

const DEMO_COLLECTIONS = [COLLECTIONS.ORDERS, COLLECTIONS.PRODUCTS, COLLECTIONS.CUSTOMERS] as const

export async function seedReset(): Promise<void> {
  const db = getDb()

  for (const name of DEMO_COLLECTIONS) {
    const result = await db.collection(name).deleteMany({})
    console.log(`✓ Cleared ${name} (${result.deletedCount} documents)`)
  }

  console.log('✓ Demo data reset complete')
}
