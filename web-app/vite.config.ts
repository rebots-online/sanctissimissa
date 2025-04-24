import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // Use absolute paths for development
  build: {
    rollupOptions: {
      output: {
        // Ensure assets use relative paths
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
  server: {
    fs: {
      // Allow serving files from one level up (where the reference folder is located)
      allow: ['..'],
    },
  },
  resolve: {
    alias: {
      // Create an alias for the reference folder
      '@reference': resolve(__dirname, '../sanctissimissa-reference')
    }
  }
})
