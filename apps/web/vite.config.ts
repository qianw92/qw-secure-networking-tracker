import path from 'node:path'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      // Lets us import "@/components/..." instead of "../../components/..."
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },

  // Vite normally only exposes variables starting with VITE_ to the browser.
  // The assignment specifies the names NEXT_PUBLIC_NEON_AUTH_URL and
  // NEXT_PUBLIC_NEON_DATA_API_URL, so we tell Vite to expose that prefix too.
  // Only add prefixes here that are safe to make public -- anything matching
  // is bundled into the JavaScript that ships to every visitor's browser.
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],

  server: {
    port: 5173,
  },
})
