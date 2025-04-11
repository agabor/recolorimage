import './assets/main.css'

import { createSSRApp } from 'vue'
import App from './App.vue'

// Create the SSR app for client-side mounting
const app = createSSRApp(App);

// Mount the app in the browser
app.mount('#recolor-app');
