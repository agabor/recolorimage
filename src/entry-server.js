import { createSSRApp } from 'vue'
import App from './App.vue'

// This function will be called by the SSR renderer
export async function render() {
  // Create a fresh app instance for each render
  const app = createSSRApp(App)
  
  // Import renderToString dynamically to avoid bundling it in the client build
  const { renderToString } = await import('vue/server-renderer')
  
  // Render the app to HTML
  const html = await renderToString(app)
  
  return html
}
