import './assets/main.css'

import { createSSRApp } from 'vue'
//import { renderToString } from 'vue/server-renderer'
import App from './App.vue'

let app = createSSRApp(App);
//console.log(renderToString(app));
app.mount('.app')
