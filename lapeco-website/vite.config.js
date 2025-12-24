import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
   server: {
    port: 5173,
    strictPort: true, // Prevent automatic port switching
    open: false // Disable automatic browser opening for Docker
  },
})
