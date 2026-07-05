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

run('node', ['scripts/build.mjs'])
run('node', ['scripts/generate-icons.mjs'])
run('npx', ['electron-builder'])
