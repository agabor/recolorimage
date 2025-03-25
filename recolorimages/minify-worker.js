import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { minify } from 'terser';

async function minifyWorker() {
  try {
    // Read the worker file
    const workerCode = readFileSync('./src/workers/imageProcessingWorker.js', 'utf8');
    
    // Minify the worker code
    const minified = await minify(workerCode, {
      compress: {
        dead_code: true,
        drop_console: true,
        drop_debugger: true,
        passes: 2
      },
      mangle: {
        toplevel: true, // Mangle top-level function names
        properties: {
          regex: /^_/ // Only mangle properties that start with underscore
        }
      },
      format: {
        comments: false
      }
    });
    
    // Ensure the assets directory exists
    const outputDir = './dist/assets';
    mkdirSync(outputDir, { recursive: true });
    
    // Write the minified worker to the output directory
    writeFileSync(`${outputDir}/imageProcessingWorker.js`, minified.code);
    
    console.log('Worker minified successfully!');
  } catch (error) {
    console.error('Error minifying worker:', error);
    process.exit(1);
  }
}

minifyWorker();
