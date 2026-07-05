import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

spawnSync('npx', ['electron-builder', 'install-app-deps'], {
  cwd: root,
  stdio: 'inherit',
  shell: true
})
