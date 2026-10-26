import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// The browser only ever talks to the API through `/api`. In development Vite proxies it to the
// local backend, so no backend URL or secret is embedded in the bundle. In production set
// VITE_API_URL to the deployed API origin (e.g. https://api.example.com/api).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5174,
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/tests/setup.ts'],
    css: false,
  },
});
