import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

// https://vite.dev/config/  // cache-bust: 2026-05-06-force
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    define: {
      __APP_VERSION__: JSON.stringify(`v${new Date().toISOString().slice(0,19).replace(/[:.]/g,'-')}`),
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'prompt',
        injectRegister: 'auto',
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
        includeAssets: ['logo.png', 'pwa-192.png', 'pwa-512.png', 'favicon.ico'],
        manifest: {
          name:             'BullWeb Chile',
          short_name:       'BullWeb',
          description:      'Sistema POS profesional',
          theme_color:      '#1B2B5E',
          background_color: '#0f172a',
          display:          'standalone',
          orientation:      'portrait',
          scope:            '/',
          start_url:        '/',
          lang:             'es',
          icons: [
            { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
            { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          ],
        },
        injectManifest: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    server: {
      port: 5173,
      host: true
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      charset: 'utf8',
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'chart-vendor': ['chart.js', 'react-chartjs-2'],
            'utils': ['axios', 'xlsx', 'jspdf']
          }
        }
      }
    }
  };
});
