import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  // '/' for local/Vercel; set VITE_BASE=/streampay/ for the GitHub Pages build.
  base: process.env.VITE_BASE || '/',
  plugins: [
    react(),
    tailwindcss(),
    // @stellar/stellar-sdk expects Node globals (global, Buffer, process) in the browser.
    nodePolyfills({ globals: { global: true, Buffer: true, process: true } }),
  ],
  server: {
    port: 5173,
  },
  build: {
    target: 'es2022',
    // The wallets kit (~1 MB) is dynamically imported in lib/wallet.tsx, so it becomes its own
    // on-demand chunk and never loads on first paint.
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          stellar: ['@stellar/stellar-sdk'],
          charts: ['recharts'],
          vendor: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query', 'framer-motion'],
        },
      },
    },
  },
});
