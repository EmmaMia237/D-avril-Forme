import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import * as path from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['/images/logo.png'],
      manifest: {
        name: "D'Avril Forme Admin",
        short_name: 'DF Admin',
        description: "D'Avril Forme administration dashboard",
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#ffffff',
        orientation: 'portrait-primary',
        icons: [
          { src: '/images/logo.png', sizes: '192x192', type: 'image/png' },
          { src: '/images/logo.png', sizes: '512x512', type: 'image/png' }
        ],
      },
      // Use injectManifest strategy with the custom service worker in src to avoid Windows path import issues when building in Linux.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      injectManifest: {
        swSrc: 'custom-sw.js',
        globPatterns: ['**/*.{js,css,html,png,svg}'],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
      },
    },
  },
  css: {
    transformer: 'lightningcss',
  },
});