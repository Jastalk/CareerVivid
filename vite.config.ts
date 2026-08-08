import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const NEXT_SEO_LOCALES = ['de', 'es', 'fr', 'ja', 'ko', 'zh'] as const;

const NEXT_SEO_NAVIGATION_DENYLIST = [
  /^\/__/,
  /^\/_next(?:\/|$)/,
  /^\/nextjs(?:\/|$)/,
  /^\/j(?:\/|$)/,
  new RegExp(`^/(?:${NEXT_SEO_LOCALES.join('|')})(?:/|$)`)
];

export default defineConfig({
    server: {
      port: 3001,
      host: '0.0.0.0'
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        includeAssets: [
          'icons/icon16.png',
          'icons/icon48.png',
          'icons/icon128.png',
          'icons/icon192.png',
          'icons/icon512.png'
        ],
        manifest: {
          name: 'CareerVivid',
          short_name: 'CareerVivid',
          description: 'AI job-search workspace for saving roles, tailoring resumes, tracking applications, and practicing interviews.',
          theme_color: '#ffffff',
          background_color: '#ffffff',
          display: 'standalone',
          icons: [
            {
              src: 'icons/icon192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'icons/icon512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          // Do not precache index.html or build chunks. Firebase Hosting headers
          // own those lifecycles so old service workers cannot serve stale shells.
          globPatterns: ['manifest.webmanifest'],
          globIgnores: ['nextjs/**/*'],
          navigateFallback: null,
          navigateFallbackDenylist: NEXT_SEO_NAVIGATION_DENYLIST,
          runtimeCaching: [
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'images-cache',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 7, // 7 Days
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'firebase-storage-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 30 // 30 Days
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true
        }
      })
    ],
    define: {
      'process.env.IS_PREACT': JSON.stringify('true')
    },
    build: {
      rollupOptions: {
        output: {
          chunkFileNames: `assets/[name]-[hash].js`,
          assetFileNames: `assets/[name]-[hash].[ext]`
        }
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        // Canonical cross-surface source (credits, pricing). functions/ gets a
        // generated copy via scripts/sync-shared.mjs — it cannot use this alias.
        '@shared': path.resolve(__dirname, './shared'),
      }
    }
});
