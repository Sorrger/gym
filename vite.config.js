import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
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
        background_color: '#f2f2f7', theme_color: '#5c76ff',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ]
})
