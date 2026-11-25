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
  build: { outDir: 'docs', emptyOutDir: true }, // GitHub Pages serves main:/docs
  plugins: [
    vue(),
    VitePWA({
      strategies: 'injectManifest', srcDir: 'src', filename: 'sw.js',
      injectRegister: false, // registered by src/updater.js (update screen)
      includeAssets: ['icon-180.png'],
      injectManifest: { globPatterns: ['**/*.{js,css,html,png,svg,woff2}'], maximumFileSizeToCacheInBytes: 5 * 1024 * 1024 },
      manifest: {
        name: 'Gym', short_name: 'Gym', lang: 'pl',
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
