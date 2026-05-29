import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const SRC_ROOT = join(import.meta.dirname, 'src')
const DIST = join(import.meta.dirname, 'dist')

const copyManifestPlugin = () => ({
  name: 'copy-manifest',
  closeBundle() {
    if (!existsSync(DIST)) mkdirSync(DIST, { recursive: true })
    copyFileSync(join(SRC_ROOT, 'manifest.json'), join(DIST, 'manifest.json'))

    // copy icons
    const iconsDir = join(DIST, 'icons')
    if (!existsSync(iconsDir)) mkdirSync(iconsDir, { recursive: true })
    const iconFiles = ['icon16.png', 'icon48.png', 'icon128.png']
    for (const f of iconFiles) {
      copyFileSync(join(SRC_ROOT, 'icons', f), join(iconsDir, f))
    }
  }
})

export default defineConfig({
  plugins: [react(), copyManifestPlugin()],
  root: SRC_ROOT,
  build: {
    outDir: DIST,
    emptyOutDir: true,
    rollupOptions: {
      input: {
        newtab: join(SRC_ROOT, 'newtab/index.html'),
        options: join(SRC_ROOT, 'options/index.html')
      }
    }
  },
  server: {
    host: '127.0.0.1',
    port: 4173
  },
  preview: {
    host: '127.0.0.1',
    port: 4173
  }
})
