import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: true,
    env: process.env
  })

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

console.log('ShopFlow stability check\n')

console.log('→ TypeScript')
run('npm', ['run', 'typecheck'])

console.log('\n→ Unit tests')
run('npx', ['vitest', 'run'])

console.log('\n✓ Project checks passed')
