import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import pngToIco from 'png-to-ico'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const buildDir = join(root, 'build')
const svgPath = join(buildDir, 'icon.svg')

const SIZES = [16, 24, 32, 48, 64, 128, 256, 512, 1024]

async function main() {
  mkdirSync(buildDir, { recursive: true })

  const svgBuffer = await sharp(svgPath).resize(1024, 1024).png().toBuffer()

  await sharp(svgBuffer).png().toFile(join(buildDir, 'icon.png'))
  await sharp(svgBuffer).resize(512, 512).png().toFile(join(buildDir, 'icon-512.png'))
  await sharp(svgBuffer).resize(256, 256).png().toFile(join(buildDir, 'icon-256.png'))

  const publicDir = join(root, 'src/renderer/public')
  mkdirSync(publicDir, { recursive: true })
  await sharp(svgBuffer).resize(256, 256).png().toFile(join(publicDir, 'icon.png'))

  const pngBuffers = await Promise.all(
    SIZES.map(async (size) => sharp(svgBuffer).resize(size, size).png().toBuffer())
  )

  const icoBuffer = await pngToIco(pngBuffers)
  writeFileSync(join(buildDir, 'icon.ico'), icoBuffer)

  console.log('Generated build/icon.png, icon-256.png, icon-512.png, icon.ico')
}

main().catch((error) => {
  console.error('Icon generation failed:', error)
  process.exit(1)
})
