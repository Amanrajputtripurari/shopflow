import { cpSync, mkdirSync } from 'node:fs'
import { resolve, join } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

/** PDFKit reads AFM metrics from __dirname/data — copy them beside the bundled main output. */
function copyPdfkitFonts() {
  return {
    name: 'copy-pdfkit-fonts',
    closeBundle() {
      const source = join('node_modules/pdfkit/js/data')
      const target = join('out/main/data')
      mkdirSync(target, { recursive: true })
      cpSync(source, target, { recursive: true })
    }
  }
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: ['pdfkit'] }), copyPdfkitFonts()],
    resolve: {
      alias: {
        '@shared': resolve('src/shared')
      }
    },
    build: {
      rollupOptions: {
        external: ['mongodb']
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': resolve('src/shared')
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@': resolve('src/renderer/src'),
        '@shared': resolve('src/shared')
      }
    },
    plugins: [react()]
  }
})
