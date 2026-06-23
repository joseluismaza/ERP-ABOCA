import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        name: 'ERP Aboca',
        short_name: 'ERP Aboca',
        description: 'Sistema ERP de gestión de trabajadores y material',
        theme_color: '#166534',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icons/logo-app.jpg',
            sizes: '192x192',
            type: 'image/jpeg',
          },
          {
            src: '/icons/logo-app.jpg',
            sizes: '512x512',
            type: 'image/jpeg',
          },
          {
            src: '/icons/logo-app.jpg',
            sizes: '512x512',
            type: 'image/jpeg',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Elimina caches de builds anteriores al activar el nuevo service worker
        cleanupOutdatedCaches: true,
        // Precachea todos los assets del build de Vite
        globPatterns: ['**/*.{js,css,html,ico,png,jpg,svg,woff2}'],
        runtimeCaching: [
          {
            // Llamadas a la API: siempre datos frescos de la red, caché como fallback
            urlPattern: /\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60, // 1 hora máximo en caché
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Fuentes de Google: caché larga, sin tráfico innecesario
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 año
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    // Activa la variante con WASM inline (base64) de @undecaf/zbar-wasm
    // Así no necesita fichero .wasm externo ni vite-plugin-wasm
    conditions: ['zbar-inlined'],
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
