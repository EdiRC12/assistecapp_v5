import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    command === 'serve' ? basicSsl() : null
  ],
  server: {
    host: true,
    watch: {
      usePolling: true,
    },
  },
}))
