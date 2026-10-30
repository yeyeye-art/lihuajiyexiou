import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      scope: '/lihuajiyexiou/',
      registerType: 'autoUpdate',
      includeAssets: ['assets/icon.png', 'assets/fonts/lihua-serif.woff2'],
      manifest: {
        name: '梨花季·译绣 — 绢白馆藏',
        short_name: '梨花季',
        description: '以绢白馆藏之心，发现传统纹样、苏绣针法与当代文创。',
        theme_color: '#F8F6EF',
        background_color: '#F8F6EF',
        display: 'standalone',
        lang: 'zh-CN',
        id: './',
        start_url: './',
        scope: './',
        icons: [
          {
            src: 'assets/icon.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'assets/icon.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        cacheId: 'lihuajiyexiou-v1',
        cleanupOutdatedCaches: true,
        // Embedded AR and face HTML must not receive the React shell.
        navigateFallbackAllowlist: [/^\/lihuajiyexiou\/(?:index\.html)?(?:\?.*)?$/],
        globPatterns: ['**/*.{js,css,html,json,ico,png,svg,webp,woff2}'],
        globIgnores: ['**/vendor-three*.js', '**/assets/vendor/three/**'],
        runtimeCaching: [
          {
            urlPattern: /.*\/vendor-three.*\.js/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'lihuajiyexiou-v1-three',
              expiration: {
                maxEntries: 5,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          {
            urlPattern: /.*\/content\/.*\.json/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'lihuajiyexiou-v1-content',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
            },
          },
          {
            urlPattern: /.*\/assets\/.*\.(webp|png|jpg|svg|woff2)/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'lihuajiyexiou-v1-media',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          {
            urlPattern: ({ url }) =>
              url.origin === self.location.origin &&
              /^\/lihuajiyexiou\/(?:assets\/|face\.(?:html|js)$)/.test(url.pathname),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'lihuajiyexiou-v1-static',
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 300,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
        ],
      },
    }),
  ],
  base: '/lihuajiyexiou/',
  server: {
    host: true,
  },
  optimizeDeps: {
    exclude: ['assets/vendor/**'],
  },
  build: {
    outDir: '_site',
    assetsDir: 'assets-app',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three') || id.includes('assets/vendor/three')) {
            return 'vendor-three';
          }
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
        },
      },
    },
  },
});
