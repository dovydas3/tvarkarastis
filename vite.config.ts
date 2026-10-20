/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages publikuoja adresu https://<vartotojas>.github.io/<repo>/,
// todėl workflow nustato BASE_PATH=/<repo>/. Lokaliai naudojamas '/'.
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Visi public/ failai jau patenka per globPatterns.
      includeManifestIcons: false,
      manifest: {
        name: 'Tvarkaraštis',
        short_name: 'Tvarkaraštis',
        description: 'Asmeninis studijų ir praktikos tvarkaraštis',
        lang: 'lt',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#0f766e',
        background_color: '#0b1120',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
  test: {
    environment: 'node',
  },
});
