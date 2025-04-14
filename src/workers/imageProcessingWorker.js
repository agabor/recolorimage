/**
 * Web Worker for image processing
 * This worker handles the CPU-intensive image processing tasks
 * to prevent UI freezing
 * 
 * This is a classic (non-module) worker
 */

// Import from colorUtils
importScripts('../utils/colorUtils.js');

/**
 * Convert a hex color string to HSL
 * @param {String} hex - Hex color string (e.g., "#FF0000")
 * @returns {Array} - HSL color value [h, s, l]
 */
function hexToHsl(hex) {
  // Remove # if present
  hex = hex.replace(/^#/, '');
  
  // Parse the hex values
  let r, g, b;
  if (hex.length === 3) {
    // Short hex format (#RGB)
    r = parseInt(hex.charAt(0) + hex.charAt(0), 16) / 255;
    g = parseInt(hex.charAt(1) + hex.charAt(1), 16) / 255;
    b = parseInt(hex.charAt(2) + hex.charAt(2), 16) / 255;
  } else {
    // Full hex format (#RRGGBB)
    r = parseInt(hex.substring(0, 2), 16) / 255;
    g = parseInt(hex.substring(2, 4), 16) / 255;
    b = parseInt(hex.substring(4, 6), 16) / 255;
  }
  
  // Convert RGB to HSL
  return rgbToHsl([r * 255, g * 255, b * 255]);
}

/**
 * Convert RGB to HSL
 * @param {Array} rgb - RGB color value [r, g, b] (0-255 range)
 * @returns {Array} - HSL color value [h, s, l]
 */
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

/**
 * Convert HSL to RGB
 * @param {Array} hsl - HSL color value [h, s, l]
 * @returns {Array} - RGB color value [r, g, b] (0-255 range)
 */
function hslToRgb(hsl) {
  const h = hsl[0];
  const s = hsl[1];
  const l = hsl[2];
  
  // If no saturation, it's a shade of gray
  if (s === 0) {
    const gray = l * 255;
    return [gray, gray, gray];
  }
  
  // Helper function for hue to RGB conversion
  const hueToRgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  
  const r = hueToRgb(p, q, (h / 360) + 1/3);
  const g = hueToRgb(p, q, h / 360);
  const b = hueToRgb(p, q, (h / 360) - 1/3);
  
  // Convert to 0-255 range
  return [
    Math.round(r * 255),
    Math.round(g * 255),
    Math.round(b * 255)
  ];
}

/**
 * Calculate the Euclidean distance between a color and its grayscale equivalent
 * @param {Array} rgbColor - RGB color value [r, g, b]
 * @returns {Number} - Distance from closest grayscale color
 */
function grayScaleDistance(rgbColor) {
  // Convert to grayscale using luminance formula
  const r = rgbColor[0];
  const g = rgbColor[1];
  const b = rgbColor[2];
  
  // Calculate grayscale value (luminance)
  const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  
  // Create grayscale equivalent
  const grayColor = [gray, gray, gray];
  
  // Calculate Euclidean distance
  return Math.sqrt(
    Math.pow(r - grayColor[0], 2) +
    Math.pow(g - grayColor[1], 2) +
    Math.pow(b - grayColor[2], 2)
  );
}

/**
 * Determine if a color is effectively grayscale
 * @param {Array} rgbColor - RGB color value [r, g, b]
 * @param {Number} threshold - Threshold value (default: 0.1)
 * @returns {Boolean} - True if color is effectively grayscale
 */
function isGrayScale(rgbColor, threshold = 0.3) {
  return grayScaleDistance(rgbColor) < threshold;
}

/**
 * Calculate the minimum absolute difference between input hue and any palette hue
 * @param {Array} hslColor - HSL color value [h, s, l]
 * @param {Array} huePalette - Array of hue palette colors
 * @returns {Number} - Minimum absolute difference between hues
 */
function hueDistance(hslColor, huePalette) {
  const hue = hslColor[0];
  
  // Find minimum distance to any palette hue
  return Math.min(...huePalette.map(paletteColor => {
    const paletteHsl = hexToHsl(paletteColor);
    const paletteHue = paletteHsl[0] || 0;
    
    // Calculate hue distance considering the circular nature of hue (0-360)
    let distance = Math.abs(hue - paletteHue);
    if (distance > 180) {
      distance = 360 - distance;
    }
    
    return distance;
  }));
}

/**
 * Mix two HSL colors with a given ratio
 * @param {Array} hsl1 - First HSL color
 * @param {Array} hsl2 - Second HSL color
 * @param {Number} ratio - Mixing ratio (0-1), 0 = all hsl1, 1 = all hsl2
 * @returns {Array} - Mixed HSL color
 */
function mixHsl(hsl1, hsl2, ratio) {
  // Ensure ratio is between 0 and 1
  ratio = Math.max(0, Math.min(1, ratio));
  
  // Extract components
  const [h1, s1, l1] = hsl1;
  const [h2, s2, l2] = hsl2;
  
  // Handle hue interpolation considering the circular nature
  let h;
  const hueDiff = Math.abs(h1 - h2);
  
  if (hueDiff > 180) {
    // Go the other way around the color wheel
    if (h1 < h2) {
      h = (h1 + 360) * (1 - ratio) + h2 * ratio;
    } else {
      h = h1 * (1 - ratio) + (h2 + 360) * ratio;
    }
    h = h % 360;
  } else {
    // Regular linear interpolation
    h = h1 * (1 - ratio) + h2 * ratio;
  }
  
  // Linear interpolation for saturation and lightness
  const s = s1 * (1 - ratio) + s2 * ratio;
  const l = l1 * (1 - ratio) + l2 * ratio;
  
  return [h, s, l];
}

/**
 * Find the closest color in a palette to a given lightness value
 * @param {Number} lightness - Lightness value (0-1)
 * @param {Array} luminancePalette - Array of colors ordered by luminance
 * @returns {Array} - RGB color from the palette
 */
function findClosestLuminanceColor(lightness, luminancePalette) {
  // Convert palette to HSL to extract lightness values
  const paletteLightness = luminancePalette.map(color => {
    const hsl = hexToHsl(color);
    return hsl[2]; // Lightness component
  });
  
  // Find the closest indices
  let lowerIndex = 0;
  let upperIndex = paletteLightness.length - 1;
  
  for (let i = 0; i < paletteLightness.length; i++) {
    if (paletteLightness[i] <= lightness) {
      lowerIndex = i;
    }
    if (paletteLightness[i] >= lightness && upperIndex === paletteLightness.length - 1) {
      upperIndex = i;
    }
  }
  
  // If exact match or at the extremes
  if (lowerIndex === upperIndex || lightness <= paletteLightness[0]) {
    return hexToHsl(luminancePalette[lowerIndex]);
  }
  
  if (lightness >= paletteLightness[paletteLightness.length - 1]) {
    return hexToHsl(luminancePalette[upperIndex]);
  }
  
  // Linear interpolation between the two closest colors
  const lowerL = paletteLightness[lowerIndex];
  const upperL = paletteLightness[upperIndex];
  const ratio = (lightness - lowerL) / (upperL - lowerL);
  
  const lowerHsl = hexToHsl(luminancePalette[lowerIndex]);
  const upperHsl = hexToHsl(luminancePalette[upperIndex]);
  
  return mixHsl(lowerHsl, upperHsl, ratio);
}

/**
 * Find the closest hue in a palette to a given hue value
 * @param {Number} hue - Hue value (0-360)
 * @param {Array} huePalette - Array of colors
 * @returns {Object} - Object containing the closest color and its index
 */
function findClosestHueColor(hue, huePalette) {
  let closestIndex = 0;
  let minDistance = 180; // Maximum possible hue distance
  
  huePalette.forEach((color, index) => {
    const paletteHsl = hexToHsl(color);
    const paletteHue = paletteHsl[0] || 0;
    
    // Calculate hue distance considering the circular nature of hue (0-360)
    let distance = Math.abs(hue - paletteHue);
    if (distance > 180) {
      distance = 360 - distance;
    }
    
    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = index;
    }
  });
  
  return {
    color: huePalette[closestIndex],
    index: closestIndex
  };
}

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
      case 'processImage': {
        // Convert the array back to a Uint8ClampedArray for processing
        const typedPixelData = new Uint8ClampedArray(pixelData);
        processImage(typedPixelData, width, height, luminancePalette, huePalette, settings);
        break;
      }
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
  console.time('Total Processing Time');
  
  // No need to convert hex strings to chroma.Color objects anymore
  console.time('Color Object Conversion');
  // We'll use the hex strings directly with our custom functions
  console.timeEnd('Color Object Conversion');
  
  // Step 1: Convert to HSL array
  console.time('HSL Conversion');
  const hslArray = pixelDataToHslArray(pixelData, width, height);
  console.timeEnd('HSL Conversion');
  
  // Step 2: Luminance Range Adjustment
  console.time('Luminance Range Adjustment');
  const luminanceAdjustedArray = adjustLuminanceRange(
    hslArray,
    luminancePalette,
    settings.outlierPercentage
  );
  console.timeEnd('Luminance Range Adjustment');
  
  // Step 3: Combined Color Mapping and Processing
  console.time('Color Mapping and Processing');
  const { processedArray, paletteBuckets, selectedBucketIndices } = processHuesAndApplyColors(
    luminanceAdjustedArray,
    luminancePalette,
    huePalette,
    settings
  );
  console.timeEnd('Color Mapping and Processing');
  
  // Step 6: Output Generation
  console.time('Output Generation');
  const processedImageData = hslArrayToImageData(processedArray, width, height);
  console.timeEnd('Output Generation');
  
  // Calculate statistics
  console.time('Statistics Calculation');
  const matchedPaletteStats = [];
  const totalPixels = width * height;
 
  if (selectedBucketIndices.length > 0) {
    // Calculate percentages for each color bucket
    selectedBucketIndices.forEach(bucketIndex => {
      const pixelCount = paletteBuckets[bucketIndex];
      let percentage = Math.round((10 * pixelCount / totalPixels) * 100) / 10;
      if (percentage > 1) {
        percentage = Math.round(percentage);
      }
      if (percentage >= 0.5) {
        matchedPaletteStats.push({
          index: bucketIndex,
          percentage: percentage
        });
      }
    });
  }
  console.timeEnd('Statistics Calculation');
  console.timeEnd('Total Processing Time');
  
  self.postMessage({ 
    processedImageData: {
      data: Array.from(processedImageData.data),
      width: processedImageData.width,
      height: processedImageData.height
    },
    matchedPaletteStats
  });
}

/**
 * Convert pixel data to HSL array
 */
function pixelDataToHslArray(pixelData, width) {
  const hslArray = [];
  
  for (let i = 0; i < pixelData.length; i += 4) {
    const r = pixelData[i];
    const g = pixelData[i + 1];
    const b = pixelData[i + 2];
    const a = pixelData[i + 3];
    
    const x = (i / 4) % width;
    const y = Math.floor((i / 4) / width);
    
    const hsl = rgbToHsl([r, g, b]);
    
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
    
    const rgb = hslToRgb(hsl);
    
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
  // Filter out transparent pixels (alpha < 25) before calculating luminance range
  const nonTransparentPixels = hslArray.filter(pixel => pixel.alpha >= 25);
  
  // Calculate luminance range of input image using only non-transparent pixels
  const inputRange = calculateLuminanceRange(
    nonTransparentPixels.map(pixel => pixel.hsl),
    outlierPercentage
  );
  
  // Calculate luminance range of palette
  const paletteLightness = luminancePalette.map(color => {
    try {
      const hsl = hexToHsl(color);
      return hsl[2]; // Lightness component
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
      // Check if input range is already inside palette range
      if (inputRange.min >= paletteRange.min && inputRange.max <= paletteRange.max) {
        // Input range is already inside palette range, do nothing
        adjustedL = l;
      } else {
        // Calculate minimum shift needed to fit input range inside palette range
        let shift = 0;
        
        // If input min is below palette min, shift up
        if (inputRange.min < paletteRange.min) {
          shift = paletteRange.min - inputRange.min;
        }
        // If input max is above palette max, shift down
        else if (inputRange.max > paletteRange.max) {
          shift = paletteRange.max - inputRange.max;
        }
        
        adjustedL = l + shift;
      }
      
      // Ensure we're within palette range (this should only affect edge cases)
      adjustedL = Math.max(paletteRange.min, Math.min(paletteRange.max, adjustedL));
    }
    
    return {
      ...pixel,
      hsl: [h, s, adjustedL]
    };
  });
}

/**
 * Process hues and apply colors in a single pass
 */
function processHuesAndApplyColors(luminanceAdjustedArray, luminancePalette, huePalette, settings) {
  // Create a counter for each hue palette color
  const paletteBuckets = new Array(huePalette.length).fill(0);
  const processedArray = new Array(luminanceAdjustedArray.length);
  
  // Process each pixel
  luminanceAdjustedArray.forEach((pixel, index) => {
    const [h, , l] = pixel.hsl;
    
    // If luminancePaletteOnly is enabled, skip hue mapping and use luminance palette for all pixels
    if (settings.luminancePaletteOnly) {
      const mappedHsl = findClosestLuminanceColor(l, luminancePalette);
      processedArray[index] = {
        ...pixel,
        hsl: mappedHsl
      };
      return;
    }
    
    // Convert to RGB to check grayscale
    const rgbColor = hslToRgb(pixel.hsl);
    
    // First check if the pixel is grayscale
    if (!isGrayScale(rgbColor, settings.grayscaleThreshold)) {
      // Only find closest hue for non-grayscale pixels
      const { color: closestColor, index: closestPaletteIndex } = findClosestHueColor(h, huePalette);
      const closestHsl = hexToHsl(closestColor);
      
      // Check if the hue is close enough to a palette color
      if (hueDistance(pixel.hsl, [closestColor]) < settings.hueThreshold) {
        // Increment counter for statistics
        paletteBuckets[closestPaletteIndex]++;
        
        // Get mapped hue and saturation from closest palette color
        const mappedHue = closestHsl[0];
        const mappedSaturation = closestHsl[1];
        
        // Keep the adjusted luminance
        processedArray[index] = {
          ...pixel,
          hsl: [mappedHue, mappedSaturation, l]
        };
        return;
      }
    }
    const mappedHsl = findClosestLuminanceColor(l, luminancePalette);
    processedArray[index] = {
      ...pixel,
      hsl: mappedHsl
    };
  });
  
  // Sort buckets by number of pixels (descending) for statistics
  const bucketIndices = Array.from({ length: huePalette.length }, (_, i) => i);
  bucketIndices.sort((a, b) => paletteBuckets[b] - paletteBuckets[a]);
  
  // Take only the non-empty buckets
  const selectedBucketIndices = bucketIndices.filter(index => paletteBuckets[index] > 0);
  
  return { processedArray, paletteBuckets, selectedBucketIndices };
}
