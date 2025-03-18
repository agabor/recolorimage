import { describe, it, expect } from 'vitest';
import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chroma from 'chroma-js';
import * as colorUtils from '../colorUtils.js';

// Get the directory name using ES module syntax
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('colorUtils', () => {
  it('creates a visualization of isHueMappable for astronaut.png', async () => {
    // Define paths
    const inputPath = path.resolve(__dirname, '../../../../sample_input/astronaut.png');
    const outputDir = path.resolve(__dirname, '../../../../test_output');
    const outputPath = path.resolve(outputDir, 'astronaut_hue_mappable.png');
    
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Load the image
    const img = await loadImage(inputPath);
    
    // Create a canvas with the same dimensions as the image
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    
    // Draw the image on the canvas
    ctx.drawImage(img, 0, 0);
    
    // Get the image data
    const imageData = ctx.getImageData(0, 0, img.width, img.height);
    const { data, width, height } = imageData;
    
    // Create a new canvas for the output
    const outputCanvas = createCanvas(width, height);
    const outputCtx = outputCanvas.getContext('2d');
    const outputImageData = outputCtx.createImageData(width, height);
    
    // Use a default palette for testing
    const huePalette = colorUtils.DEFAULT_PALETTES.nord.hue;
    
    // Process each pixel
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      
      // Convert RGB to HSL
      const hsl = chroma([r, g, b]).hsl();
      
      // Check each condition separately
      const rgbColor = [r, g, b];
      const isNotGrayScale = !colorUtils.isGrayScale(rgbColor);
      const isHueOnPalette = colorUtils.isHueOnPalette(hsl, huePalette);
      const isSlOnPalette = colorUtils.isSlOnPalette(hsl, huePalette);
      
      // Set each channel based on the corresponding condition
      outputImageData.data[i] = isNotGrayScale ? 255 : 0;     // R: not grayscale
      outputImageData.data[i + 1] = isHueOnPalette ? 255 : 0; // G: hue on palette
      outputImageData.data[i + 2] = isSlOnPalette ? 255 : 0;  // B: sl on palette
      outputImageData.data[i + 3] = a;          // A
    }
    
    // Put the image data on the output canvas
    outputCtx.putImageData(outputImageData, 0, 0);
    
    // Save the output image
    const buffer = outputCanvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);
    
    // Verify the output file exists
    expect(fs.existsSync(outputPath)).toBe(true);
    
    // Log the output path and explanation for reference
    console.log(`Output image saved to: ${outputPath}`);
    console.log('Color channels represent:');
    console.log('- Red channel: !isGrayScale(rgbColor)');
    console.log('- Green channel: isHueOnPalette(hslColor, huePalette)');
    console.log('- Blue channel: isSlOnPalette(hslColor, huePalette)');
  });
});
