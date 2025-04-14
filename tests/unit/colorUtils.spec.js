import { describe, it, expect } from 'vitest';
import { calculateLuminanceRange, DEFAULT_PALETTES } from '@/utils/colorUtils';
import fs from 'fs';
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

// Helper function to convert RGB to HSL
function rgbToHsl(rgb) {
  // Normalize RGB values to 0-1 range
  const r = rgb[0] / 255;
  const g = rgb[1] / 255;
  const b = rgb[2] / 255;
  
  // Find min and max values
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  
  // Calculate lightness
  const l = (max + min) / 2;
  
  // If min and max are the same, it's a shade of gray (no saturation)
  if (max === min) {
    return [0, 0, l]; // Hue is 0, saturation is 0
  }
  
  // Calculate saturation
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  
  // Calculate hue
  let h;
  switch (max) {
    case r:
      h = (g - b) / d + (g < b ? 6 : 0);
      break;
    case g:
      h = (b - r) / d + 2;
      break;
    case b:
      h = (r - g) / d + 4;
      break;
  }
  
  h = h * 60; // Convert to degrees
  
  return [h, s, l];
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
