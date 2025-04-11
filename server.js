import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, createServer } from 'vite';

// Get the directory name of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function renderApp() {
  console.log('Creating production build...');
  
  // First, create a production build for client-side
  await build({
    mode: 'production',
    build: {
      outDir: 'dist',
      emptyOutDir: true
    }
  });
  
  console.log('Production build completed. Setting up SSR environment...');
  
  // Create Vite server in middleware mode for SSR
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
    mode: 'production' // Use production mode
  });
  
  try {
    // Load the entry-server.js file through Vite
    const { render } = await vite.ssrLoadModule('/src/entry-server.js');
    
    // Render the app to HTML
    console.log('Rendering app to HTML...');
    const appHtml = await render();
    
    // Read the recolorimage.php file
    const phpFilePath = path.join(__dirname, 'recolorimage.php');
    let phpContent = await fs.readFile(phpFilePath, 'utf8');
    
    // Replace the placeholder with the rendered HTML
    phpContent = phpContent.replace(
      '<!-- SSR_APP_PLACEHOLDER -->',
      appHtml
    );
    
    // Write the updated recolorimage.php file
    await fs.writeFile(phpFilePath, phpContent);
    
    console.log('Pre-rendering complete. Updated recolorimage.php with server-rendered HTML.');
  } catch (error) {
    console.error('Error in production build or pre-rendering:', error);
    process.exit(1);
  } finally {
    // Close Vite server
    await vite.close();
  }
}

renderApp();
