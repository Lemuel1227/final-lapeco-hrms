import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true, // Prevent automatic port switching
    open: true // Automatically open browser
  },
  resolve: {
    alias: {
      '@': '/src' // Create alias for src directory
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets', // Organize static assets
    sourcemap: true // Helpful for debugging
  },
  css: {
    devSourcemap: true // CSS sourcemaps for debugging
  }
});