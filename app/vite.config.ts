import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Maria Elena Wash',
        short_name: 'ME Wash',
        description: 'Lavado de autos móvil en barrios cerrados y clubes.',
        lang: 'es-AR',
        theme_color: '#0e7490',
        background_color: '#f4f6f8',
        display: 'standalone',
        start_url: '/',
        icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
    }),
  ],
})
