import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { resolve } from 'node:path'
import fs from 'node:fs'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    vue({
      // Disable the inspector in production mode
      template: {
        compilerOptions: {
          isCustomElement: tag => tag.includes('-'),
          // Disable the inspector in production mode
          hoistStatic: true,
          // This will remove the data-v-inspector attributes in production
          __DEV__: mode === 'development'
        }
      }
    }),
    // Only include Vue DevTools in development mode
    mode === 'development' ? vueDevTools() : null,
  ].filter(Boolean),
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
    // Copy the worker file to the output directory
    closeBundle() {
      const workerSrc = resolve(__dirname, 'src/workers/imageProcessingWorker.js');
      const workerDest = resolve(__dirname, 'dist/assets/imageProcessingWorker.js');
      
      // Ensure the assets directory exists
      if (!fs.existsSync(resolve(__dirname, 'dist/assets'))) {
        fs.mkdirSync(resolve(__dirname, 'dist/assets'), { recursive: true });
      }
      
      // Copy the worker file
      fs.copyFileSync(workerSrc, workerDest);
      console.log('Worker file copied to output directory');
    }
  }
}))
