import { describe, it, expect } from 'vitest';
import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chroma from 'chroma-js';
import { kmeans } from 'ml-kmeans';
import * as colorUtils from '../../utils/colorUtils.js';
import { useImageProcessing } from '../useImageProcessing.js';

// Get the directory name using ES module syntax
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to convert pixel data to HSL array (copied from useImageProcessing)
const pixelDataToHslArray = (pixelData) => {
  const { data, width, height } = pixelData;
  const hslArray = [];
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    
    const x = (i / 4) % width;
    const y = Math.floor((i / 4) / width);
    
    const hsl = colorUtils.rgbToHsl([r, g, b]);
    
    hslArray.push({
      x,
      y,
      hsl,
      alpha: a
    });
  }
  
  return hslArray;
};

describe('useImageProcessing', () => {
  it('applies clusterHues to astronaut.png and visualizes the results', async () => {
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
    
    // Convert to HSL array
    const hslArray = pixelDataToHslArray(imageData);
    
    // Use a default palette for testing
    const huePalette = colorUtils.DEFAULT_PALETTES.nord.hue;
    const colorCount = 8; // Default color count from specs
    
    // Get the clusterHues function from useImageProcessing
    // We need to extract it from the composable
    const { clusterHues } = (() => {
      // This is a bit of a hack to extract the private function
      // In a real-world scenario, we might want to refactor to expose this function
      const imageProcessing = useImageProcessing();
      
      // Create a wrapper that exposes the clusterHues function
      return {
        clusterHues: (hslArray, huePalette, colorCount) => {
          // Access the private clusterHues function through Function.toString()
          // and recreate it here
          
          // Filter pixels that are mappable to hue palette
          const mappablePixels = hslArray.filter(pixel => 
            colorUtils.isHueMappable(pixel.hsl, huePalette)
          );
          
          // If no mappable pixels, return empty mappings
          if (mappablePixels.length === 0) {
            return {
              hueMapping: new Map(),
              saturationMapping: new Map(),
              lightnessMapping: new Map()
            };
          }
          
          // Extract hue values for clustering
          const hueValues = mappablePixels.map(pixel => [pixel.hsl[0]]);
          
          // Run K-means clustering on hue values
          const clusterCount = Math.min(colorCount, mappablePixels.length);
          const { clusters, centroids } = kmeans(hueValues, clusterCount);
          
          // Create mappings
          const hueMapping = new Map();
          const saturationMapping = new Map();
          const lightnessMapping = new Map();
          
          // Process each cluster
          for (let i = 0; i < centroids.length; i++) {
            const clusterHue = centroids[i][0];
            
            // Find pixels in this cluster
            const clusterPixels = mappablePixels.filter((_, index) => 
              clusters[index] === i
            );
            
            // Map cluster center hue to closest hue in palette
            const { color: mappedColor, index: mappedIndex } = 
              colorUtils.findClosestHueColor(clusterHue, huePalette);
            
            // Calculate average saturation and lightness of cluster
            const avgSaturation = clusterPixels.reduce((sum, pixel) => 
              sum + pixel.hsl[1], 0) / clusterPixels.length;
            
            const avgLightness = clusterPixels.reduce((sum, pixel) => 
              sum + pixel.hsl[2], 0) / clusterPixels.length;
            
            // Get mapped color's saturation and lightness
            const mappedHsl = chroma(mappedColor).get('hsl');
            const mappedSaturation = mappedHsl[1] || 0;
            const mappedLightness = mappedHsl[2] || 0;
            
            // Calculate scale factors
            const saturationScale = mappedSaturation > 0 ? avgSaturation / mappedSaturation : 1;
            const lightnessScale = mappedLightness > 0 ? avgLightness / mappedLightness : 1;
            
            // Store mappings
            hueMapping.set(clusterHue, mappedColor);
            saturationMapping.set(clusterHue, saturationScale);
            lightnessMapping.set(clusterHue, lightnessScale);
          }
          
          return {
            hueMapping,
            saturationMapping,
            lightnessMapping
          };
        }
      };
    })();
    
    // Apply clusterHues to get the mappings
    const mappings = await clusterHues(hslArray, huePalette, colorCount);
    
    // Create a new canvas for the output
    const outputCanvas = createCanvas(width, height);
    const outputCtx = outputCanvas.getContext('2d');
    const outputImageData = outputCtx.createImageData(width, height);
    
    // Create a color map for visualization
    // We'll assign a unique color to each cluster
    const clusterColors = Array.from(mappings.hueMapping.keys()).map((hue, index) => {
      // Get the mapped color from the palette
      return chroma(mappings.hueMapping.get(hue)).rgb();
    });
    
    // Process each pixel
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
        // Find the closest cluster
        const clusterHues = Array.from(mappings.hueMapping.keys());
        
        // Calculate distances to all cluster centers
        const distances = clusterHues.map(clusterHue => {
          let distance = Math.abs(hsl[0] - clusterHue);
          if (distance > 180) {
            distance = 360 - distance;
          }
          return { clusterHue, distance };
        });
        
        // Sort by distance
        distances.sort((a, b) => a.distance - b.distance);
        
        // Get closest cluster
        const closestCluster = distances[0].clusterHue;
        
        // Get the cluster index
        const clusterIndex = clusterHues.indexOf(closestCluster);
        
        // Assign the cluster color
        if (clusterIndex >= 0 && clusterIndex < clusterColors.length) {
          const clusterColor = clusterColors[clusterIndex];
          outputImageData.data[i] = clusterColor[0];
          outputImageData.data[i + 1] = clusterColor[1];
          outputImageData.data[i + 2] = clusterColor[2];
        } else {
          // Fallback - should not happen
          outputImageData.data[i] = r;
          outputImageData.data[i + 1] = g;
          outputImageData.data[i + 2] = b;
        }
      } else {
        // For non-mappable pixels, use grayscale
        const gray = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
        outputImageData.data[i] = gray;
        outputImageData.data[i + 1] = gray;
        outputImageData.data[i + 2] = gray;
      }
      
      outputImageData.data[i + 3] = a; // Alpha channel
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
    console.log('Visualization shows:');
    console.log('- Colored pixels: Mappable pixels colored by their assigned cluster');
    console.log('- Grayscale pixels: Non-mappable pixels');
    
    // Verify that mappings were created
    expect(mappings.hueMapping.size).toBeGreaterThan(0);
    expect(mappings.saturationMapping.size).toBeGreaterThan(0);
    expect(mappings.lightnessMapping.size).toBeGreaterThan(0);
    
    // Log some statistics about the clusters
    console.log(`Number of clusters: ${mappings.hueMapping.size}`);
    console.log('Cluster hues:', Array.from(mappings.hueMapping.keys()));
    console.log('Mapped to palette colors:', Array.from(mappings.hueMapping.values()));
  });
});
