import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@core': path.resolve(__dirname, './packages/core/src'),
      '@client': path.resolve(__dirname, './src/client'),
    },
  },
  build: {
    outDir: 'dist/client',
    rollupOptions: {
      input: {
        splash: path.resolve(__dirname, 'src/client/splash.html'),
        game: path.resolve(__dirname, 'src/client/game.html'),
      },
    },
  },
  server: {
    port: 3000,
  },
});
