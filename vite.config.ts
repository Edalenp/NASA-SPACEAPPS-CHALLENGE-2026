import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'
import { wgslVitePlugin } from '@vgpu/wgsl/loader-vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    wgslVitePlugin(),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    VitePWA({
      // Registration and offline readiness are managed once by src/pwa/state.ts.
      injectRegister: false,
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'models/*.glb'],
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
        globPatterns: ['**/*.{js,css,html,json,glb,woff,woff2,svg,png,jpg,jpeg,webp,md,txt}'],
        // The anatomy model is ~7.6 MB and must be cached for offline use.
        maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
      },
      manifest: {
        name: 'VITRUVIO · Autonomous crew health',
        short_name: 'VITRUVIO',
        description: 'An offline body twin that helps astronauts read their own vital signs.',
        theme_color: '#292e25',
        background_color: '#292e25',
        display: 'standalone',
        // The installed app opens on the crew console, not the landing page.
        start_url: '/lab',
        scope: '/',
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  build: {
    chunkSizeWarningLimit: 1400,
  },
})
