import './assets/main.css'

import { createApp, createSSRApp } from 'vue'
import App from './App.vue'

// Determine if we're running in the browser
const isClient = typeof window !== 'undefined'

// Create the appropriate app instance
const app = isClient 
  ? createApp(App) 
  : createSSRApp(App)

// Mount the app if we're in the browser
if (isClient) {
  // Use hydrate: true if the app was pre-rendered
  app.mount('#recolorimage-app', true)
}

// Export the app for SSR
export { app }
