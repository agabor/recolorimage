import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { renderToString } from '@vue/server-renderer';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function buildSSR() {
  return new Promise((resolve, reject) => {
    console.log('Building SSR bundle...');
    const buildProcess = spawn('vite', ['build', '--ssr', 'src/main.js'], {
      env: { ...process.env, SSR: 'true' },
      stdio: 'inherit',
      shell: true
    });

    buildProcess.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`SSR build failed with code ${code}`));
      }
    });
  });
}

async function prerender() {
  try {
    // Build the SSR bundle
    await buildSSR();
    
    // Import the SSR bundle
    const { app } = await import('./dist/assets/main.js');
    
    // Render the app to HTML
    const appHtml = await renderToString(app);
    
    // Read the index.html template
    const template = fs.readFileSync(
      path.resolve(__dirname, 'index.html'),
      'utf-8'
    );
    
    // Replace the app placeholder with the rendered HTML
    let html = template.replace(
      '<div id="recolorimage-app"></div>',
      `<div id="recolorimage-app">${appHtml}</div>`
    );
    
    // Replace the script tag to point to the built JS file
    html = html.replace(
      '<script type="module" src="/src/main.js"></script>',
      '<script type="module" src="/assets/index.js"></script>'
    );
    
    // Ensure the output directory exists
    const outDir = path.resolve(__dirname, 'dist');
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
    
    // Write the prerendered HTML to the output file
    fs.writeFileSync(path.resolve(outDir, 'index.html'), html);
    
    console.log('Prerendering complete!');
  } catch (err) {
    console.error('Prerendering failed:', err);
    process.exit(1);
  }
}

prerender();
