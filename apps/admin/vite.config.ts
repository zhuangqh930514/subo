import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return
          }

          if (id.includes('element-plus')) {
            return 'element-plus'
          }

          if (id.includes('@element-plus/icons-vue')) {
            return 'element-plus-icons'
          }

          if (id.includes('vue')) {
            return 'vue-vendor'
          }

          return 'vendor'
        },
      },
    },
  },
  server: {
    port: 5173,
  },
})
