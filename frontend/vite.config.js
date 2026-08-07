import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // Keeps your Tailwind CSS styles working
  ],
  build: {
    // Correctly nested limit parameter
    chunkSizeWarningLimit: 1000,
  },
})
