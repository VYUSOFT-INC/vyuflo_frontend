import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
        registerType: 'autoUpdate',
        injectRegister: false,
        includeAssets: [
          'favicon.svg',
          'pwa/apple-touch-icon.png',
          'pwa/icon-192.png',
          'pwa/icon-512.png',
        ],
        manifest: {
          name: 'Vyuflo — Immigration Case Management',
          short_name: 'Vyuflo',
          description:
            'Secure immigration case management for employees, HR teams, and attorneys.',
          theme_color: '#2563eb',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait-primary',
          scope: '/',
          start_url: '/',
          categories: ['business', 'productivity'],
          icons: [
            {
              src: '/pwa/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/pwa/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: '/pwa/icon-192-maskable.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable',
            },
            {
              src: '/pwa/icon-512-maskable.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        injectManifest: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webmanifest}'],
          // Main app chunk is currently ~2.8MB; raise so it can be precached offline.
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        },
        // Needed so beforeinstallprompt can fire during local testing
        devOptions: {
          enabled: true,
          type: 'module',
          navigateFallback: 'index.html',
        },
      }),
    ],
    server: {
      host: true,
      port: 5174,
      allowedHosts: ['.ngrok-free.dev', '.ngrok-free.app'],
      proxy: {
        '/api': {
          target: env.VITE_PROXY_TARGET,
          changeOrigin: true,
          secure: false,
        },
        '/static': {
          target: 'https://lying-cruelly-scanner.ngrok-free.dev/',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
