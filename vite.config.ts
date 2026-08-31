import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        sidepanel: resolve(projectRoot, 'sidepanel.html'),
        background: resolve(projectRoot, 'src/background/index.ts'),
        windMainBridge: resolve(projectRoot, 'src/content/wind-main-bridge.ts'),
        windRelay: resolve(projectRoot, 'src/content/wind-relay.ts'),
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
