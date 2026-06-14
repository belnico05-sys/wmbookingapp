import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Lavatrici — Prenotazioni',
        short_name: 'Lavatrici',
        description: 'Prenotazione lavatrici e asciugatrici della residenza',
        theme_color: '#2b3db3',
        background_color: '#f0f1f8',
        display: 'standalone',
        // TODO: replace with real icons during the design pass
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
})
