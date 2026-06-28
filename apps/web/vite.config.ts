import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
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
  },
});
