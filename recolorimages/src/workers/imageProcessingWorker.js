/**
 * Web Worker for image processing
 * This worker handles the CPU-intensive image processing tasks
 * to prevent UI freezing
 */
import chroma from 'chroma-js';
import * as colorUtils from '../utils/colorUtils';

/**
 * Process pixel data in the worker
 */
self.onmessage = function(e) {
  const { 
    type, 
    pixelData, 
    width, 
    height, 
    luminancePalette, 
    huePalette, 
    settings 
  } = e.data;
  
  try {
    switch (type) {
      case 'processImage':
        // Convert the array back to a Uint8ClampedArray for processing
        const typedPixelData = new Uint8ClampedArray(pixelData);
        processImage(typedPixelData, width, height, luminancePalette, huePalette, settings);
        break;
      default:
        self.postMessage({ error: `Unknown command: ${type}` });
    }
  } catch (err) {
    console.error('Error processing image:', err);
    self.postMessage({ error: err.message });
  }
};

/**
 * Process the image with the provided settings
 */
function processImage(pixelData, width, height, luminancePalette, huePalette, settings) {
  // Convert hex strings back to chroma.Color objects
  luminancePalette = luminancePalette.map(hex => chroma(hex));
  huePalette = huePalette.map(hex => chroma(hex));
  
  // Step 1: Convert to HSL array
  self.postMessage({ status: 'Processing image...' });
  const hslArray = pixelDataToHslArray(pixelData, width, height);
  
  // Step 2: Luminance Range Adjustment
  const luminanceAdjustedArray = adjustLuminanceRange(
    hslArray,
    luminancePalette,
    settings.outlierPercentage
  );
  
  // Step 3: Luminance Mapping
  const luminanceMappedArray = mapLuminance(
    luminanceAdjustedArray,
    luminancePalette
  );
  
  // Step 4: Hue Clustering
  const mappings = clusterHues(
    luminanceAdjustedArray,
    huePalette,
    settings.colorCount
  );
  
  
  // Step 5: Hue and Saturation Application
  const finalArray = applyHueAndSaturation(
    luminanceAdjustedArray,
    luminanceMappedArray,
    mappings
  );
  
  // Step 6: Output Generation
  const processedImageData = hslArrayToImageData(finalArray, width, height);
  
  // Extract the palette indices that were matched
  const matchedPaletteIndices = [];
  if (mappings.length > 0) {
    // For each mapping, find the index of the mapped color in the huePalette
    mappings.forEach(mapping => {
      const mappedColorHex = mapping[1];
      const paletteIndex = huePalette.findIndex(color => 
        chroma(color).hex() === chroma(mappedColorHex).hex()
      );
      if (paletteIndex !== -1 && !matchedPaletteIndices.includes(paletteIndex)) {
        matchedPaletteIndices.push(paletteIndex);
      }
    });
  }
  
  self.postMessage({ 
    status: 'Processing complete',
    processedImageData: {
      data: Array.from(processedImageData.data),
      width: processedImageData.width,
      height: processedImageData.height
    },
    matchedPaletteIndices
  });
}

/**
 * Convert pixel data to HSL array
 */
function pixelDataToHslArray(pixelData, width, height) {
  const hslArray = [];
  
  for (let i = 0; i < pixelData.length; i += 4) {
    const r = pixelData[i];
    const g = pixelData[i + 1];
    const b = pixelData[i + 2];
    const a = pixelData[i + 3];
    
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
}

/**
 * Convert HSL array to ImageData
 */
function hslArrayToImageData(hslArray, width, height) {
  const data = new Uint8ClampedArray(width * height * 4);
  
  hslArray.forEach(pixel => {
    const { x, y, hsl, alpha } = pixel;
    const index = (y * width + x) * 4;
    
    const rgb = colorUtils.hslToRgb(hsl);
    
    data[index] = Math.round(rgb[0]);
    data[index + 1] = Math.round(rgb[1]);
    data[index + 2] = Math.round(rgb[2]);
    data[index + 3] = alpha;
  });
  
  return { data, width, height };
}

/**
 * Adjust the luminance range of an HSL image
 */
function adjustLuminanceRange(hslArray, luminancePalette, outlierPercentage) {
  // Calculate luminance range of input image
  const inputRange = colorUtils.calculateLuminanceRange(
    hslArray.map(pixel => pixel.hsl),
    outlierPercentage
  );
  
  // Calculate luminance range of palette
  const paletteLightness = luminancePalette.map(color => {
    try {
      return chroma(color).get('hsl.l');
    } catch (err) {
      console.error('Error converting color:', color, err);
      return 0;
    }
  });
  let paletteRange = {
    min: 1000,
    max: -1000
  }
  for (let l of paletteLightness) {
    if (l < paletteRange.min) {
      paletteRange.min = l;
    }
    if (l > paletteRange.max) {
      paletteRange.max = l;
    }
  }
  
  // Calculate input range width
  const inputRangeWidth = inputRange.max - inputRange.min;
  const paletteRangeWidth = paletteRange.max - paletteRange.min;
  
  // Create a new array with adjusted lightness
  return hslArray.map(pixel => {
    const [h, s, l] = pixel.hsl;
    let adjustedL = l;
    
    // If input range > palette range: scale down
    if (inputRangeWidth > paletteRangeWidth) {
      // Scale down
      const scaleFactor = paletteRangeWidth / inputRangeWidth;
      adjustedL = paletteRange.min + (l - inputRange.min) * scaleFactor;
    } else {
      // Shift (no scaling up)
      // Center the input range within the palette range
      const shift = (paletteRange.min + paletteRange.max - inputRange.min - inputRange.max) / 2;
      adjustedL = l + shift;
      
      // Clamp to palette range
      adjustedL = Math.max(paletteRange.min, Math.min(paletteRange.max, adjustedL));
    }
    
    return {
      ...pixel,
      hsl: [h, s, adjustedL]
    };
  });
}

/**
 * Map pixels to luminance palette
 */
function mapLuminance(hslArray, luminancePalette) {
  return hslArray.map(pixel => {
    const [h, s, l] = pixel.hsl;
    
    // Find corresponding color on luminance palette
    const mappedRgb = colorUtils.findClosestLuminanceColor(l, luminancePalette);
    const mappedHsl = colorUtils.rgbToHsl(mappedRgb);
    
    return {
      ...pixel,
      hsl: mappedHsl
    };
  });
}

/**
 * Bucket hues and create mappings
 */
function clusterHues(hslArray, huePalette, colorCount) {
  // Filter pixels that are mappable to hue palette
  const mappablePixels = hslArray.filter(pixel => 
    colorUtils.isHueMappable(pixel.hsl, huePalette)
  );
  
  // If no mappable pixels, return empty array
  if (mappablePixels.length === 0) {
    return [];
  }
  
  // Create a bucket for each hue palette color
  const paletteBuckets = Array(huePalette.length).fill().map(() => []);
  
  // Assign each pixel to the bucket with the closest hue color
  mappablePixels.forEach(pixel => {
    const hue = pixel.hsl[0];
    const { index: closestPaletteIndex } = colorUtils.findClosestHueColor(hue, huePalette);
    paletteBuckets[closestPaletteIndex].push(pixel);
  });
  
  // Sort buckets by number of pixels (descending)
  const bucketIndices = Array.from({ length: huePalette.length }, (_, i) => i);
  bucketIndices.sort((a, b) => paletteBuckets[b].length - paletteBuckets[a].length);
  
  // Take only the top colorCount buckets (or fewer if there aren't enough non-empty buckets)
  const selectedBucketIndices = bucketIndices
    .filter(index => paletteBuckets[index].length > 0)
    .slice(0, colorCount);
  
  // Create mappings as arrays of key-value pairs
  const hueMapping = [];
  
  // Process each selected bucket
  for (const bucketIndex of selectedBucketIndices) {
    const pixelsInBucket = paletteBuckets[bucketIndex];
    
    if (pixelsInBucket.length === 0) continue;
    
    // Calculate average hue in the bucket
    const huesInBucket = pixelsInBucket.map(pixel => pixel.hsl[0]);
    const avgHue = huesInBucket.reduce((sum, hue) => sum + hue, 0) / huesInBucket.length;
    
    // Find the lowest and highest hue values in this bucket
    let minHue = 1000;
    let maxHue = -1000;
    for (let hue of huesInBucket) {
      if (hue < minHue) {
        minHue = hue;
      }
      if (hue > maxHue) {
        maxHue = hue;
      }
    }
    
    // Get the palette color for this bucket
    const mappedColor = huePalette[bucketIndex];
    
    // Store mappings as key-value pairs in arrays
    // Include the min and max hue values along with the average hue and mapped color
    hueMapping.push([avgHue, mappedColor, minHue, maxHue]);
  }
  
  return hueMapping;
}

/**
 * Create an image showing the hue classification
 * Each pixel is colored with its mapped palette color
 */
function createHueClassificationImage(hslArray, hueMapping) {
  // If no mappings, return original array
  if (hueMapping.length === 0) {
    return hslArray;
  }
  
  return hslArray.map(pixel => {
    const [h, s, l] = pixel.hsl;
    
    // Find the cluster where the pixel's hue is between min and max hue
    let mappedColorHex = null;
    
    // Check if the pixel's hue falls within any cluster's min-max range
    for (let i = 0; i < hueMapping.length; i++) {
      const pair = hueMapping[i];
      const minHue = pair[2];
      const maxHue = pair[3];
      
      // Handle the circular nature of hue (0-360)
      let isInRange = false;
      
      if (maxHue >= minHue) {
        // Normal case: min to max
        isInRange = h >= minHue && h <= maxHue;
      } else {
        // Wrapping case: e.g., min=350, max=10
        isInRange = h >= minHue || h <= maxHue;
      }
      
      if (isInRange) {
        mappedColorHex = pair[1];
        break;
      }
    }
    
    // If no cluster contains the hue, fall back to finding the closest cluster min or max value
    if (!mappedColorHex) {
      // Create an array of all min and max values from clusters
      const clusterBoundaries = [];
      
      hueMapping.forEach(pair => {
        const centroidHue = pair[0];
        const minHue = pair[2];
        const maxHue = pair[3];
        
        clusterBoundaries.push({ hue: minHue, centroidHue });
        clusterBoundaries.push({ hue: maxHue, centroidHue });
      });
      
      // Calculate distances to all cluster boundaries
      const distances = clusterBoundaries.map(boundary => {
        let distance = Math.abs(h - boundary.hue);
        if (distance > 180) {
          distance = 360 - distance;
        }
        return { ...boundary, distance };
      });
      
      // Sort by distance
      distances.sort((a, b) => a.distance - b.distance);
      
      // Get closest boundary's cluster
      const clusterHue = distances[0].centroidHue;
      
      // Find the mapped values in the arrays
      const mappedColorPair = hueMapping.find(pair => pair[0] === clusterHue);
      mappedColorHex = mappedColorPair ? mappedColorPair[1] : null;
    }
    
    if (!mappedColorHex) {
      return pixel;
    }
    
    // Get the mapped color's HSL values
    const mappedHsl = chroma(mappedColorHex).hsl();
    
    // Return a new pixel with the mapped color's HSL values
    return {
      ...pixel,
      hsl: mappedHsl
    };
  });
}

/**
 * Apply hue and saturation of mapped colors to the luminance-mapped image
 */
function applyHueAndSaturation(luminanceAdjustedArray, luminanceMappedArray, hueMapping) {
  // If no mappings, return luminance-mapped array
  if (hueMapping.length === 0) {
    return luminanceMappedArray;
  }
  
  return luminanceAdjustedArray.map((pixel, index) => {
    const [h, s, l] = pixel.hsl;
    const luminanceMappedPixel = luminanceMappedArray[index];
    
    // Find the cluster where the pixel's hue falls within the cluster's min-max range
    let mappedColorPair = null;
    let clusterHue = null;
    
    // Check if the pixel's hue falls within any cluster's min-max range
    for (let i = 0; i < hueMapping.length; i++) {
      const pair = hueMapping[i];
      const minHue = pair[2];
      const maxHue = pair[3];
      
      // Handle the circular nature of hue (0-360)
      let isInRange = false;
      
      if (maxHue >= minHue) {
        // Normal case: min to max
        isInRange = h >= minHue && h <= maxHue;
      } else {
        // Wrapping case: e.g., min=350, max=10
        isInRange = h >= minHue || h <= maxHue;
      }
      
      if (isInRange) {
        mappedColorPair = pair;
        clusterHue = pair[0];
        break;
      }
    }
    
    // If no cluster contains the hue, use the corresponding pixel from the luminance-mapped image
    if (!mappedColorPair) {
      return luminanceMappedPixel;
    }
    
    const mappedColor = mappedColorPair[1];
    
    // Get mapped hue and saturation
    const mappedHsl = chroma(mappedColor).hsl();
    const mappedHue = mappedHsl[0];
    const mappedSaturation = mappedHsl[1];
    
    // Use the luminance value from the luminance-mapped pixel
    const luminanceValue = luminanceMappedPixel.hsl[2];
    
    return {
      ...pixel,
      hsl: [mappedHue, mappedSaturation, luminanceValue]
    };
  });
}
