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
        name: 'Brillo Móvil',
        short_name: 'Brillo Móvil',
        description: 'Lavado de autos móvil en barrios cerrados y clubes.',
        lang: 'es-AR',
        theme_color: '#0e7490',
        background_color: '#f4f6f8',
        display: 'standalone',
        // Absolutos: la app no vive en la raíz del dominio, sino en /maria-elena-wash/.
        // (con rutas relativas, algunos navegadores no resuelven bien el arranque al instalar como app)
        start_url: '/maria-elena-wash/',
        scope: '/maria-elena-wash/',
        icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
    }),
  ],
})
