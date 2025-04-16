import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { resolve } from 'node:path'
import fs from 'node:fs'

// Custom plugin to handle worker file processing
function workerProcessingPlugin() {
  return {
    name: 'worker-processing',
    closeBundle() {
      const dirname = fileURLToPath(new URL('.', import.meta.url));
      const workerSrc = resolve(dirname, 'src/workers/imageProcessingWorker.js');
      const workerDest = resolve(dirname, 'dist/assets/imageProcessingWorker.js');
      const workerUtilsSrc = resolve(dirname, 'src/workers/workerUtils.js');
      
      // Ensure the assets directory exists
      if (!fs.existsSync(resolve(dirname, 'dist/assets'))) {
        fs.mkdirSync(resolve(dirname, 'dist/assets'), { recursive: true });
      }
      
      // Copy the worker file
      //concatenate the two files
      const workerContent = fs.readFileSync(workerSrc, 'utf-8');
      //remove the imports from the worker file
      const workerContentWithoutImports = workerContent
        .replace(/import .* from .*;\n/g, '')
        .replace(/\/\/ Import utility functions directly from workerUtils.js\n/g, '');
      
      // Remove export keywords from utility functions
      const workerUtilsContent = fs.readFileSync(workerUtilsSrc, 'utf-8')
        .replace(/export /g, '');
      
      const combinedContent = `${workerUtilsContent}\n${workerContentWithoutImports}`;
      fs.writeFileSync(workerDest, combinedContent, 'utf-8');
      console.log('Worker file copied to output directory');
    }
  };
}

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
    // Add our custom worker processing plugin
    workerProcessingPlugin(),
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
    target: 'es2015'
  }
}))
