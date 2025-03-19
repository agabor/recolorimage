/**
 * Web Worker for image processing
 * This worker handles the CPU-intensive image processing tasks
 * to prevent UI freezing
 */
import { kmeans } from 'ml-kmeans';
import chroma from 'chroma-js';

// Since we can't import directly in workers, we'll need to implement
// or copy the necessary color utility functions here
const colorUtils = {
  rgbToHsl(rgb) {
    const r = rgb[0] / 255;
    const g = rgb[1] / 255;
    const b = rgb[2] / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    
    if (max === min) {
      h = s = 0; // achromatic
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      
      h /= 6;
    }
    
    return [h * 360, s, l];
  },
  
  hslToRgb(hsl) {
    const h = hsl[0] / 360;
    const s = hsl[1];
    const l = hsl[2];
    
    let r, g, b;
    
    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    
    return [r * 255, g * 255, b * 255];
  },
  
  calculateLuminanceRange(hslArray, outlierPercentage) {
    // Extract lightness values
    const lightness = hslArray.map(hsl => hsl[2]).sort((a, b) => a - b);
    
    // Calculate outlier indices
    const lowerIndex = Math.floor(lightness.length * (outlierPercentage / 100));
    const upperIndex = Math.floor(lightness.length * (1 - outlierPercentage / 100));
    
    // Get min and max lightness (excluding outliers)
    const min = lightness[lowerIndex] || 0;
    const max = lightness[upperIndex] || 1;
    
    return { min, max };
  },
  
  findClosestLuminanceColor(lightness, luminancePalette) {
    // Convert palette colors to HSL to extract lightness
    const paletteLightness = luminancePalette.map(color => {
      try {
        return chroma(color).get('hsl.l');
      } catch (err) {
        console.error('Error converting color:', color, err);
        return 0;
      }
    });
    
    // Find the closest colors by lightness
    let lowerIndex = 0;
    let upperIndex = 0;
    
    for (let i = 0; i < paletteLightness.length; i++) {
      if (paletteLightness[i] <= lightness) {
        lowerIndex = i;
      }
      if (paletteLightness[i] >= lightness && upperIndex === 0) {
        upperIndex = i;
      }
    }
    
    // If lightness is outside the palette range, use the closest endpoint
    if (lightness <= paletteLightness[0]) {
      return chroma(luminancePalette[0]).rgb();
    }
    
    if (lightness >= paletteLightness[paletteLightness.length - 1]) {
      return chroma(luminancePalette[luminancePalette.length - 1]).rgb();
    }
    
    // Linear interpolation between the two closest colors
    const lowerColor = chroma(luminancePalette[lowerIndex]);
    const upperColor = chroma(luminancePalette[upperIndex]);
    
    const lowerL = paletteLightness[lowerIndex];
    const upperL = paletteLightness[upperIndex];
    
    // Calculate interpolation factor
    const factor = (lightness - lowerL) / (upperL - lowerL);
    
    // Interpolate between the two colors
    const interpolatedColor = chroma.mix(lowerColor, upperColor, factor, 'rgb');
    
    return interpolatedColor.rgb();
  },
  
  grayScaleDistance(rgbColor) {
    const r = rgbColor[0];
    const g = rgbColor[1];
    const b = rgbColor[2];
    
    const avg = (r + g + b) / 3;
    
    return Math.sqrt(
      Math.pow(r - avg, 2) +
      Math.pow(g - avg, 2) +
      Math.pow(b - avg, 2)
    ) / 255;
  },
  
  isGrayScale(hslColor, threshold) {
    const [h, s, l] = hslColor;
    return s < threshold;
  },
  
  hueDistance(hslColor, huePalette) {
    const hue = hslColor[0];
    
    let minDistance = 360;
    
    for (const color of huePalette) {
      try {
        const paletteHue = chroma(color).get('hsl.h') || 0;
        
        // Calculate distance in hue space (considering the circular nature)
        let distance = Math.abs(hue - paletteHue);
        if (distance > 180) {
          distance = 360 - distance;
        }
        
        minDistance = Math.min(minDistance, distance);
      } catch (err) {
        console.error('Error calculating hue distance:', err);
      }
    }
    
    return minDistance;
  },
  
  isHueOnPalette(hslColor, huePalette, threshold) {
    return this.hueDistance(hslColor, huePalette) < threshold;
  },
  
  slDistance(hslColor, huePalette) {
    const s = hslColor[1];
    const l = hslColor[2];
    
    let minDistance = 2; // Maximum possible distance in SL space is sqrt(2)
    
    for (const color of huePalette) {
      try {
        const paletteHsl = chroma(color).hsl();
        const paletteS = paletteHsl[1] || 0;
        const paletteL = paletteHsl[2] || 0;
        
        // Calculate Euclidean distance in SL space
        const distance = Math.sqrt(
          Math.pow(s - paletteS, 2) +
          Math.pow(l - paletteL, 2)
        );
        
        minDistance = Math.min(minDistance, distance);
      } catch (err) {
        console.error('Error calculating SL distance:', err);
      }
    }
    
    return minDistance;
  },
  
  isSlOnPalette(hslColor, huePalette, threshold) {
    return this.slDistance(hslColor, huePalette) < threshold;
  },
  
  isHueMappable(hslColor, huePalette) {
    return (
      !this.isGrayScale(hslColor, 0.1) &&
      this.isHueOnPalette(hslColor, huePalette, 15) &&
      this.isSlOnPalette(hslColor, huePalette, 0.2)
    );
  },
  
  findClosestHueColor(hue, huePalette) {
    let closestColor = huePalette[0];
    let closestDistance = 360;
    let closestIndex = 0;
    
    for (let i = 0; i < huePalette.length; i++) {
      try {
        const color = huePalette[i];
        const paletteHue = chroma(color).get('hsl.h') || 0;
        
        // Calculate distance in hue space (considering the circular nature)
        let distance = Math.abs(hue - paletteHue);
        if (distance > 180) {
          distance = 360 - distance;
        }
        
        if (distance < closestDistance) {
          closestDistance = distance;
          closestColor = color;
          closestIndex = i;
        }
      } catch (err) {
        console.error('Error finding closest hue color:', err);
      }
    }
    
    return { color: closestColor, index: closestIndex };
  },
  
  blendFactor(hslColor, huePalette) {
    const [h, s, l] = hslColor;
    
    // Calculate factors
    const grayFactor = 1 - s; // Higher saturation = less gray
    const hueFactor = this.isHueOnPalette(hslColor, huePalette, 15) ? 1 : 0;
    const slFactor = this.isSlOnPalette(hslColor, huePalette, 0.2) ? 1 : 0;
    
    // Weighted combination
    return (0.4 * (1 - grayFactor)) + (0.3 * hueFactor) + (0.3 * slFactor);
  }
};

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
    self.postMessage({ error: err.message });
  }
};

/**
 * Process the image with the provided settings
 */
function processImage(pixelData, width, height, luminancePalette, huePalette, settings) {
  // Step 1: Convert to HSL array
  self.postMessage({ progress: 10, status: 'Converting to HSL' });
  const hslArray = pixelDataToHslArray(pixelData, width, height);
  
  // Step 2: Luminance Range Adjustment
  self.postMessage({ progress: 20, status: 'Adjusting luminance range' });
  const luminanceAdjustedArray = adjustLuminanceRange(
    hslArray,
    luminancePalette,
    settings.outlierPercentage
  );
  
  // Create luminance-adjusted image
  const luminanceAdjustedImageData = hslArrayToImageData(luminanceAdjustedArray, width, height);
  // Make sure to convert the Uint8ClampedArray to a regular Array for cloning
  self.postMessage({ 
    progress: 30, 
    status: 'Luminance adjusted',
    luminanceAdjustedImageData: {
      data: Array.from(luminanceAdjustedImageData.data),
      width: luminanceAdjustedImageData.width,
      height: luminanceAdjustedImageData.height
    }
  });
  
  // Step 3: Luminance Mapping
  self.postMessage({ progress: 40, status: 'Mapping luminance' });
  const luminanceMappedArray = mapLuminance(
    luminanceAdjustedArray,
    luminancePalette
  );
  
  // Create luminance-mapped image
  const luminanceMappedImageData = hslArrayToImageData(luminanceMappedArray, width, height);
  self.postMessage({ 
    progress: 50, 
    status: 'Luminance mapped',
    luminanceMappedImageData: {
      data: Array.from(luminanceMappedImageData.data),
      width: luminanceMappedImageData.width,
      height: luminanceMappedImageData.height
    }
  });
  
  // Step 4: Hue Clustering
  self.postMessage({ progress: 60, status: 'Clustering hues' });
  const mappings = clusterHues(
    luminanceAdjustedArray,
    huePalette,
    settings.colorCount
  );
  
  // Step 5: Color Adjustment
  self.postMessage({ progress: 70, status: 'Adjusting colors' });
  const colorAdjustedArray = adjustColors(
    luminanceAdjustedArray,
    mappings
  );
  
  // Create color-adjusted image
  const colorAdjustedImageData = hslArrayToImageData(colorAdjustedArray, width, height);
  self.postMessage({ 
    progress: 80, 
    status: 'Colors adjusted',
    colorAdjustedImageData: {
      data: Array.from(colorAdjustedImageData.data),
      width: colorAdjustedImageData.width,
      height: colorAdjustedImageData.height
    }
  });
  
  // Step 6: Blending
  self.postMessage({ progress: 90, status: 'Blending images' });
  const blendedArray = blendImages(
    luminanceMappedArray,
    colorAdjustedArray,
    huePalette
  );
  
  // Step 7: Output Generation
  const processedImageData = hslArrayToImageData(blendedArray, width, height);
  self.postMessage({ 
    progress: 100, 
    status: 'Processing complete',
    processedImageData: {
      data: Array.from(processedImageData.data),
      width: processedImageData.width,
      height: processedImageData.height
    }
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
  const paletteRange = {
    min: Math.min(...paletteLightness),
    max: Math.max(...paletteLightness)
  };
  
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
 * Cluster hues and create mappings
 */
function clusterHues(hslArray, huePalette, colorCount) {
  // Filter pixels that are mappable to hue palette
  const mappablePixels = hslArray.filter(pixel => 
    colorUtils.isHueMappable(pixel.hsl, huePalette)
  );
  
  // If no mappable pixels, return empty mappings as arrays
  if (mappablePixels.length === 0) {
    return {
      hueMapping: [],
      saturationMapping: [],
      lightnessMapping: []
    };
  }
  
  // Extract hue values for clustering
  const hueValues = mappablePixels.map(pixel => [pixel.hsl[0]]);
  
  // Run K-means clustering on hue values
  const clusterCount = Math.min(colorCount, mappablePixels.length);
  const { clusters, centroids } = kmeans(hueValues, clusterCount);
  
  // Create mappings as arrays of key-value pairs instead of Maps
  // to ensure they can be cloned when sent back to the main thread
  const hueMapping = [];
  const saturationMapping = [];
  const lightnessMapping = [];
  
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
    const mappedHsl = chroma(mappedColor).hsl();
    const mappedSaturation = mappedHsl[1];
    const mappedLightness = mappedHsl[2];
    
    // Calculate scale factors
    const saturationScale = mappedSaturation > 0 ? avgSaturation / mappedSaturation : 1;
    const lightnessScale = mappedLightness > 0 ? avgLightness / mappedLightness : 1;
    
    // Store mappings as key-value pairs in arrays
    hueMapping.push([clusterHue, mappedColor]);
    saturationMapping.push([clusterHue, saturationScale]);
    lightnessMapping.push([clusterHue, lightnessScale]);
  }
  
  return {
    hueMapping,
    saturationMapping,
    lightnessMapping
  };
}

/**
 * Adjust colors based on hue clustering
 */
function adjustColors(hslArray, mappings) {
  const { hueMapping, saturationMapping, lightnessMapping } = mappings;
  
  // If no mappings, return original array
  if (hueMapping.length === 0) {
    return hslArray;
  }
  
  return hslArray.map(pixel => {
    const [h, s, l] = pixel.hsl;
    
    // Extract cluster hues from the mapping arrays
    const clusterHues = hueMapping.map(pair => pair[0]);
    if (clusterHues.length === 0) {
      return pixel;
    }
    
    // Calculate distances to all cluster centers
    const distances = clusterHues.map(clusterHue => {
      let distance = Math.abs(h - clusterHue);
      if (distance > 180) {
        distance = 360 - distance;
      }
      return { clusterHue, distance };
    });
    
    // Sort by distance
    distances.sort((a, b) => a.distance - b.distance);
    
    // Get closest cluster
    const closestCluster = distances[0].clusterHue;
    
    // Find the mapped values in the arrays
    const mappedColorPair = hueMapping.find(pair => pair[0] === closestCluster);
    const saturationScalePair = saturationMapping.find(pair => pair[0] === closestCluster);
    const lightnessScalePair = lightnessMapping.find(pair => pair[0] === closestCluster);
    
    const mappedColor = mappedColorPair ? mappedColorPair[1] : null;
    const saturationScale = saturationScalePair ? saturationScalePair[1] : 1;
    const lightnessScale = lightnessScalePair ? lightnessScalePair[1] : 1;
    
    if (!mappedColor) {
      return pixel;
    }
    
    // Get mapped hue
    const mappedHsl = chroma(mappedColor).hsl();
    const mappedHue = mappedHsl[0];
    
    // Apply adjustments
    const adjustedHue = mappedHue;
    const adjustedSaturation = Math.min(1, s * saturationScale);
    const adjustedLightness = Math.min(1, l * lightnessScale);
    
    return {
      ...pixel,
      hsl: [adjustedHue, adjustedSaturation, adjustedLightness]
    };
  });
}

/**
 * Blend luminance-mapped and color-adjusted images
 */
function blendImages(luminanceArray, colorArray, huePalette) {
  return luminanceArray.map((lumPixel, index) => {
    const colorPixel = colorArray[index];
    
    // Calculate blend factor
    const factor = colorUtils.blendFactor(colorPixel.hsl, huePalette);
    
    // Linear interpolation between luminance and color pixels
    const blendedHsl = [
      colorPixel.hsl[0], // Use hue from color-adjusted pixel
      lumPixel.hsl[1] * (1 - factor) + colorPixel.hsl[1] * factor, // Blend saturation
      lumPixel.hsl[2] * (1 - factor) + colorPixel.hsl[2] * factor  // Blend lightness
    ];
    
    return {
      ...lumPixel,
      hsl: blendedHsl
    };
  });
}
