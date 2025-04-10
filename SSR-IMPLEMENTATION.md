# Server-Side Rendering Implementation

This document explains how server-side rendering (SSR) has been implemented in the Recolor Image WordPress plugin.

## Overview

The Vue.js application has been modified to support pre-rendering during the build process. This means that the initial HTML is rendered on the server (during build time) and then hydrated on the client, providing several benefits:

1. **Improved Initial Load Performance**: Users see the rendered UI immediately, without waiting for JavaScript to load and execute.
2. **Better SEO**: Search engines can more easily index the content of the application.
3. **Enhanced User Experience**: The application appears to load faster, even on slower connections.

## Implementation Details

### 1. Dependencies

The following dependencies were added to support pre-rendering:

- `@vue/server-renderer`: For rendering Vue components to HTML strings
- `@vitejs/plugin-vue-jsx`: For JSX support in Vue components

### 2. Vue Application Changes

The main entry point (`src/main.js`) was updated to support both client-side rendering and server-side rendering:

```javascript
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
```

### 3. Pre-rendering Script

A new script (`prerender.js`) was created to handle the pre-rendering process:

1. Build an SSR-compatible version of the Vue app
2. Import the SSR bundle
3. Render the app to an HTML string
4. Insert the rendered HTML into the index.html template
5. Update script references to point to the built assets
6. Save the pre-rendered HTML to the output directory

### 4. Vite Configuration

The Vite configuration (`vite.config.js`) was updated to support both client-side and server-side builds:

- Added support for JSX
- Added configuration for SSR builds
- Created conditional configuration based on the build target (client or server)

### 5. WordPress Integration

The WordPress plugin (`recolorimage.php`) was updated to use the pre-rendered HTML:

```php
public function render_shortcode($atts) {
    $this->shortcode_used = true;
    
    // Get the pre-rendered HTML from the index.html file
    $html_file = plugin_dir_path(__FILE__) . 'dist/index.html';
    
    if (file_exists($html_file)) {
        $html_content = file_get_contents($html_file);
        
        // Extract just the app div with its pre-rendered content
        preg_match('/<div id="recolorimage-app">(.*?)<\/div>/s', $html_content, $matches);
        
        if (!empty($matches[0])) {
            return $matches[0];
        }
    }
    
    // Fallback to empty div if pre-rendered HTML is not available
    return '<div id="recolorimage-app"></div>';
}
```

### 6. Build Process

The build process was updated to include pre-rendering:

1. Build the client-side version of the app
2. Minify the web worker
3. Pre-render the app
4. Package everything into the WordPress plugin

## Potential Issues and Solutions

### 1. Client-Side Only Features

Some features may only work on the client side, such as:

- Browser-specific APIs
- DOM manipulation
- User interactions

Solution: Use conditional checks (`if (typeof window !== 'undefined')`) to ensure code only runs in the appropriate environment.

### 2. Hydration Mismatches

If the pre-rendered HTML doesn't match what the client-side rendering would produce, Vue will issue hydration mismatch warnings.

Solution: Ensure components render consistently in both environments and avoid using browser-specific values during the initial render.

### 3. Dynamic Content

Pre-rendering happens at build time, so any content that depends on runtime data (like API calls) won't be included in the pre-rendered HTML.

Solution: Design the application to gracefully handle loading states and fetch dynamic data after hydration.

## Conclusion

The implementation of pre-rendering in the Recolor Image WordPress plugin provides a better user experience with faster initial loads while maintaining all the interactive features of the Vue.js application. The pre-rendered HTML is seamlessly integrated into WordPress through the shortcode system.
