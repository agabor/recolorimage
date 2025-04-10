import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import process from 'node:process'

// https://vite.dev/config/
export default defineConfig(() => {
  const isSSR = process.env.SSR === 'true';
  
  return {
    plugins: [
      vue(),
      vueJsx(),
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
        input: isSSR 
          ? fileURLToPath(new URL('./src/main.js', import.meta.url))
          : fileURLToPath(new URL('./index.html', import.meta.url)),
        output: {
          format: isSSR ? 'esm' : 'iife',
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
      // Enable SSR features
      ssr: isSSR ? {
        // Externalize dependencies that shouldn't be bundled into the SSR build
        noExternal: ['vue', '@vue/server-renderer']
      } : undefined
    },
    // Add SSR specific options
    ssr: {
      // Avoid issues with browser-specific code during SSR
      format: 'esm',
      // Optimize dependencies for SSR
      optimizeDeps: {
        include: ['vue', '@vue/server-renderer']
      }
    }
  }
})
