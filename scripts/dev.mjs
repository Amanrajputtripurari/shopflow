import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const child = spawn('npx', ['electron-vite', 'dev'], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
  env: process.env
})

child.on('exit', (code) => {
  process.exit(code ?? 0)
})
