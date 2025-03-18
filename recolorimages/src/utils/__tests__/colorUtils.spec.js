import { describe, it, expect } from 'vitest';
import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chroma from 'chroma-js';
import * as colorUtils from '../colorUtils.js';
import { useImageProcessing } from '../../composables/useImageProcessing.js';

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
    
    // Use a more vibrant palette for testing
    const huePalette = colorUtils.DEFAULT_PALETTES.monokai.hue;
    
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

  it('creates a visualization of hue clusters for astronaut.png', async () => {
    // Define paths
    const inputPath = path.resolve(__dirname, '../../../../sample_input/astronaut.png');
    const outputDir = path.resolve(__dirname, '../../../../test_output');
    const outputPath = path.resolve(outputDir, 'astronaut_hue_clusters.png');
    
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
    
    // Convert pixel data to HSL array for clusterHues
    const hslArray = [];
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      
      const x = (i / 4) % width;
      const y = Math.floor((i / 4) / width);
      
      const hsl = chroma([r, g, b]).hsl();
      
      hslArray.push({
        x,
        y,
        hsl,
        alpha: a
      });
    }
    
    // Use the useImageProcessing composable
    const imageProcessing = useImageProcessing();
    
    // First, adjust the luminance range as in the actual processing pipeline
    const luminanceAdjustedArray = imageProcessing.adjustLuminanceRange(
      hslArray,
      colorUtils.DEFAULT_PALETTES.nord.luminance
    );
    
    // Then cluster the hues
    const colorCount = 8; // Default color count from specs
    const mappings = imageProcessing.clusterHues(luminanceAdjustedArray, huePalette, colorCount);
    
    // Get the mappings
    const { hueMapping, saturationMapping, lightnessMapping } = mappings;
    
    // Create an array of cluster hues for easy lookup
    const clusterHueArray = Array.from(hueMapping.keys());
    
    // Print mappings textually
    console.log('Hue Mappings:');
    clusterHueArray.forEach(clusterHue => {
      const mappedColor = hueMapping.get(clusterHue);
      console.log(`  Cluster Hue: ${clusterHue.toFixed(2)} -> Mapped Color: ${mappedColor}`);
    });
    
    console.log('Saturation Mappings:');
    clusterHueArray.forEach(clusterHue => {
      const satScale = saturationMapping.get(clusterHue);
      console.log(`  Cluster Hue: ${clusterHue.toFixed(2)} -> Saturation Scale: ${satScale.toFixed(2)}`);
    });
    
    console.log('Lightness Mappings:');
    clusterHueArray.forEach(clusterHue => {
      const lightScale = lightnessMapping.get(clusterHue);
      console.log(`  Cluster Hue: ${clusterHue.toFixed(2)} -> Lightness Scale: ${lightScale.toFixed(2)}`);
    });
    
    // Count mappable pixels
    let mappableCount = 0;
    let totalPixels = data.length / 4;
    
    // We'll just use the output canvas directly without additional visualization elements
    
    // Process each pixel for the output image
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      
      // Convert RGB to HSL
      const hsl = chroma([r, g, b]).hsl();
      
      // Check if the pixel is mappable
      const rgbColor = [r, g, b];
      const isMappable = colorUtils.isHueMappable(hsl, huePalette);
      
      if (isMappable) {
        mappableCount++;
      }
      
      if (isMappable && clusterHueArray.length > 0) {
        // Find the closest cluster hue
        let closestClusterHue = clusterHueArray[0];
        let minDistance = 180;
        
        for (const clusterHue of clusterHueArray) {
          let distance = Math.abs(hsl[0] - clusterHue);
          if (distance > 180) {
            distance = 360 - distance;
          }
          
          if (distance < minDistance) {
            minDistance = distance;
            closestClusterHue = clusterHue;
          }
        }
        
        // Get the mapped color for this cluster
        const mappedColor = hueMapping.get(closestClusterHue);
        if (mappedColor) {
          // Use chroma.js directly to ensure proper color conversion
          const chromaColor = chroma(mappedColor);
          const mappedRgb = chromaColor.rgb();
          
          // Assign the mapped color to the output
          outputImageData.data[i] = mappedRgb[0];
          outputImageData.data[i + 1] = mappedRgb[1];
          outputImageData.data[i + 2] = mappedRgb[2];
          outputImageData.data[i + 3] = a;
        } else {
          // If no mapping, use a default color (white)
          outputImageData.data[i] = 255;
          outputImageData.data[i + 1] = 255;
          outputImageData.data[i + 2] = 255;
          outputImageData.data[i + 3] = a;
        }
      } else {
        // For non-mappable pixels, use light gray (more visible)
        outputImageData.data[i] = 200;
        outputImageData.data[i + 1] = 200;
        outputImageData.data[i + 2] = 200;
        outputImageData.data[i + 3] = a;
      }
    }
    
    // Put the processed image data on the output canvas
    outputCtx.putImageData(outputImageData, 0, 0);
    
    // Save the output image directly
    const buffer = outputCanvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);
    
    // Verify the output file exists
    expect(fs.existsSync(outputPath)).toBe(true);
    
    // Log the output path and explanation for reference
    console.log(`Output image saved to: ${outputPath}`);
    console.log(`Mappable pixels: ${mappableCount} out of ${totalPixels} (${(mappableCount/totalPixels*100).toFixed(2)}%)`);
    console.log('Visualization shows:');
    console.log('- Mappable pixels: Colored according to their cluster mapping');
    console.log('- Non-mappable pixels: Shown in light gray');
    
    // Print palette colors for reference
    console.log('Palette colors used:');
    huePalette.forEach((color, index) => {
      const rgb = chroma(color).rgb();
      console.log(`  ${index}: ${color} -> RGB(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`);
    });
  });
});
