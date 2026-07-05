import { loadMainEnv, getDevMongoDbUrl } from '../../config/env'
import { connectMongo, disconnectMongo } from '../connection'
import { runMigrations } from '../index-manager'
import { seedCore } from './seed-core'
import { seedDemo } from './seed-demo'
import { seedReset } from './seed-reset'
import { printLoginCredentials, resetAdminPassword, seedUsers } from './seed-users'

const COMMANDS = ['all', 'migrate', 'core', 'users', 'demo', 'reset', 'admin:reset'] as const
type SeedCommand = (typeof COMMANDS)[number]

function usage(): void {
  console.log(`
ShopFlow database seeders

Usage: npm run seed[:command]

Commands:
  all          migrations + core + users + demo (default)
  migrate      run migrations only
  core         app settings, company profile, setup flag
  users        default admin + staff user
  demo         sample products, customers, orders
  reset        clear products, customers, orders (keeps users/settings)
  admin:reset  reset admin password to "admin"

Requires MONGODB_URL in .env (see .env.example)
`)
}

function parseCommand(raw: string | undefined): SeedCommand {
  const command = (raw ?? 'all') as SeedCommand
  if (!COMMANDS.includes(command)) {
    console.error(`Unknown command: ${raw}`)
    usage()
    process.exit(1)
  }
  return command
}

async function main(): Promise<void> {
  const command = parseCommand(process.argv[2])

  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    usage()
    return
  }

  loadMainEnv(process.cwd())
  const url = getDevMongoDbUrl()

  if (!url) {
    console.error('Missing MONGODB_URL. Copy .env.example to .env and set your MongoDB URL.')
    process.exit(1)
  }

  console.log(`→ Connecting to ${url.replace(/\/\/.*@/, '//***@')} ...`)
  await connectMongo(url)

  try {
    switch (command) {
      case 'migrate':
        await runMigrations()
        console.log('✓ Migrations complete')
        break
      case 'core':
        await seedCore()
        break
      case 'users':
        await seedUsers()
        await printLoginCredentials()
        break
      case 'demo':
        await seedDemo()
        break
      case 'reset':
        if (!process.argv.includes('--yes')) {
          console.error('Add --yes to confirm demo data reset (orders, products, customers)')
          process.exit(1)
        }
        await seedReset()
        break
      case 'admin:reset':
        await resetAdminPassword()
        await printLoginCredentials()
        break
      case 'all':
        await seedCore()
        await seedUsers()
        await seedDemo()
        await printLoginCredentials()
        break
    }

    console.log('\nDone.')
  } finally {
    await disconnectMongo()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
