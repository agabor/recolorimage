import { describe, it, expect } from 'vitest';
import { rgbToHsl, DEFAULT_PALETTES } from '@/utils/colorUtils';
import { calculateLuminanceRange, adjustLuminanceRange } from '@/workers/workerUtils';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { createCanvas, loadImage } from 'canvas';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper function to convert hex to RGB
function hexToRgb(hex) {
  // Remove # if present
  hex = hex.replace(/^#/, '');
  
  // Parse the hex values
  let r, g, b;
  if (hex.length === 3) {
    // Short hex format (#RGB)
    r = parseInt(hex.charAt(0) + hex.charAt(0), 16);
    g = parseInt(hex.charAt(1) + hex.charAt(1), 16);
    b = parseInt(hex.charAt(2) + hex.charAt(2), 16);
  } else {
    // Full hex format (#RRGGBB)
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  }
  
  return [r, g, b];
}

// Helper function to get the luminance range of a palette
function getPaletteLuminanceRange(palette) {
  const lightnessValues = palette.map(color => {
    const rgb = hexToRgb(color);
    const hsl = rgbToHsl(rgb);
    return hsl[2]; // Lightness component
  });
  
  return {
    min: Math.min(...lightnessValues),
    max: Math.max(...lightnessValues)
  };
}

describe('calculateLuminanceRange', () => {
  it('should return a luminance range within the Nord palette range for swatchbook.png', async () => {
    // Get the Nord palette luminance range
    const nordPalette = DEFAULT_PALETTES.nord.luminance;
    const nordRange = getPaletteLuminanceRange(nordPalette);
    
    // Load the swatchbook.png image
    const imagePath = resolve(__dirname, '../../sample_input/swatchbook.png');
    const image = await loadImage(imagePath);
    
    // Create a canvas and draw the image
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    
    // Get the pixel data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixelData = imageData.data;
    
    // Convert to HSL and filter out transparent pixels
    const hslValues = [];
    for (let i = 0; i < pixelData.length; i += 4) {
      const r = pixelData[i];
      const g = pixelData[i + 1];
      const b = pixelData[i + 2];
      const a = pixelData[i + 3];
      
      // Skip transparent pixels (alpha < 25)
      if (a >= 25) {
        const hsl = rgbToHsl([r, g, b]);
        hslValues.push(hsl);
      }
    }
    
    // Calculate the luminance range
    const luminanceRange = calculateLuminanceRange(hslValues);
    
    // Assert that the image's luminance range is within the Nord palette's range
    expect(luminanceRange.min).toBeGreaterThanOrEqual(nordRange.min);
    expect(luminanceRange.max).toBeLessThanOrEqual(nordRange.max);
    
    // Log the ranges for debugging
    console.log('Nord palette luminance range:', nordRange);
    console.log('Swatchbook.png luminance range:', luminanceRange);
  });
});

describe('adjustLuminanceRange', () => {
  it('should not modify the image when its range is within the Nord palette range', async () => {
    // Get the Nord palette
    const nordPalette = DEFAULT_PALETTES.nord.luminance;
    
    // Load the swatchbook.png image
    const imagePath = resolve(__dirname, '../../sample_input/swatchbook.png');
    const image = await loadImage(imagePath);
    
    // Create a canvas and draw the image
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    
    // Get the pixel data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixelData = imageData.data;
    
    // Convert to HSL array with alpha values
    const hslArray = [];
    for (let i = 0; i < pixelData.length; i += 4) {
      const r = pixelData[i];
      const g = pixelData[i + 1];
      const b = pixelData[i + 2];
      const a = pixelData[i + 3];
      
      const hsl = rgbToHsl([r, g, b]);
      hslArray.push({
        hsl,
        alpha: a
      });
    }
    
    // Adjust luminance range
    const adjustedHslArray = adjustLuminanceRange(hslArray, nordPalette, 5);
    
    // Verify each pixel's HSL values remain unchanged
    for (let i = 0; i < hslArray.length; i++) {
      const op = hslArray[i];
      if (op.alpha < 25)
        continue;
      const ap = adjustedHslArray[i];
      expect(ap.hsl[0]).toBeCloseTo(op.hsl[0], 1); // Hue
      expect(ap.hsl[1]).toBeCloseTo(op.hsl[1], 1); // Saturation
      expect(ap.hsl[2]).toBeCloseTo(op.hsl[2], 1); // Lightness
    }
  }, { timeout: 30000 });
});
