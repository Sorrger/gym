import { defineConfig } from 'vite'
import { execSync } from 'node:child_process'
// version shown in Ustawienia: build date + git commit
const sha = (() => { try { return execSync('git rev-parse --short HEAD').toString().trim() } catch { return 'dev' } })()
const BUILD = new Date().toISOString().slice(0, 10) + ' · ' + sha
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  define: { __BUILD__: JSON.stringify(BUILD) },
  base: './',
  build: {
    outDir: 'docs', emptyOutDir: true, // GitHub Pages serves main:/docs
    // Ionic's component files register nothing at import time (components are defined only when a Vue wrapper is used),
    // but the package doesn't say so – without this every Ionic component (date picker, select, range…) lands in the start bundle
    rollupOptions: { treeshake: { moduleSideEffects: id => !/@ionic[\\/]core[\\/]components[\\/]/.test(id) } }
  },
  plugins: [
    vue(),
    VitePWA({
      strategies: 'injectManifest', srcDir: 'src', filename: 'sw.js',
      injectRegister: false, // registered by src/updater.js (update screen)
      includeAssets: ['icon-180.png'],
      injectManifest: { globPatterns: ['**/*.{js,css,html,png,svg,woff2}'], maximumFileSizeToCacheInBytes: 5 * 1024 * 1024 },
      manifest: {
        name: 'Inch Up', short_name: 'Inch Up', lang: 'pl',
        display: 'standalone', start_url: './', scope: './',
        background_color: '#f2f2f7', theme_color: '#7346f5',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ]
})
