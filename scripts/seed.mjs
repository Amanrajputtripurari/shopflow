import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const args = process.argv.slice(2)

const child = spawn(
  'npx',
  ['tsx', '--tsconfig', join(root, 'tsconfig.seed.json'), join(root, 'src/main/database/seeds/run.ts'), ...args],
  {
    cwd: root,
    stdio: 'inherit',
    shell: true,
    env: process.env
  }
)

child.on('exit', (code) => {
  process.exit(code ?? 0)
})
