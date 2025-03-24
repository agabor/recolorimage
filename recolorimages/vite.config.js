import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    cssCodeSplit: false,
    rollupOptions: {
      input: fileURLToPath(new URL('./index.html', import.meta.url)),
      output: {
        format: 'iife',
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    },
    css: {
      devSourcemap: true,
      extract: true
    },
    target: 'es2015',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        dead_code: true,
        collapse_vars: true,
        reduce_vars: true,
        pure_getters: true,
        unsafe: true,
        unsafe_math: true,
        unsafe_proto: true,
        passes: 3
      },
      mangle: {
        properties: {
          regex: /^_/
        },
        toplevel: true,
        safari10: true
      },
      format: {
        comments: false,
        beautify: false,
        ascii_only: true
      }
    }
  }
})
