/**
 * Web Worker for image processing
 * This worker handles the CPU-intensive image processing tasks
 * to prevent UI freezing
 */
import chroma from 'chroma-js';

/**
 * Convert RGB to HSL
 * @param {Array} rgb - RGB color value [r, g, b]
 * @returns {Array} - HSL color value [h, s, l]
 */
function rgbToHsl(rgb) {
  return chroma(rgb).hsl();
}

/**
 * Convert HSL to RGB
 * @param {Array} hsl - HSL color value [h, s, l]
 * @returns {Array} - RGB color value [r, g, b]
 */
function hslToRgb(hsl) {
  return chroma.hsl(...hsl).rgb();
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
    const paletteHue = chroma(paletteColor).get('hsl.h') || 0;
    
    // Calculate hue distance considering the circular nature of hue (0-360)
    let distance = Math.abs(hue - paletteHue);
    if (distance > 180) {
      distance = 360 - distance;
    }
    
    return distance;
  }));
}

/**
 * Find the closest color in a palette to a given lightness value
 * @param {Number} lightness - Lightness value (0-1)
 * @param {Array} luminancePalette - Array of colors ordered by luminance
 * @returns {Array} - RGB color from the palette
 */
function findClosestLuminanceColor(lightness, luminancePalette) {
  // Convert palette to HSL to extract lightness values
  const paletteLightness = luminancePalette.map(color => 
    chroma(color).get('hsl.l')
  );
  
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
    return chroma(luminancePalette[lowerIndex]).hsl();
  }
  
  if (lightness >= paletteLightness[paletteLightness.length - 1]) {
    return chroma(luminancePalette[upperIndex]).hsl();
  }
  
  // Linear interpolation between the two closest colors
  const lowerL = paletteLightness[lowerIndex];
  const upperL = paletteLightness[upperIndex];
  const ratio = (lightness - lowerL) / (upperL - lowerL);
  
  const lowerColor = chroma(luminancePalette[lowerIndex]);
  const upperColor = chroma(luminancePalette[upperIndex]);
  
  return chroma.mix(lowerColor, upperColor, ratio, 'hsl').hsl();
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
    const paletteHue = chroma(color).get('hsl.h') || 0;
    
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
 * Calculate the luminance range of an image
 * @param {Array} hslImage - Array of HSL pixel values
 * @param {Number} outlierPercentage - Percentage of outliers to exclude (default: 5)
 * @returns {Object} - Object containing min and max luminance values
 */
function calculateLuminanceRange(hslImage, outlierPercentage = 5) {
  // Extract lightness values
  const lightnessValues = hslImage.map(pixel => pixel[2]);
  
  // Sort lightness values
  lightnessValues.sort((a, b) => a - b);
  
  // Calculate indices for outlier removal
  const lowerIndex = Math.floor(lightnessValues.length * (outlierPercentage / 100));
  const upperIndex = Math.floor(lightnessValues.length * (1 - outlierPercentage / 100));
  
  // Get min and max lightness values excluding outliers
  const minLightness = lightnessValues[lowerIndex];
  const maxLightness = lightnessValues[upperIndex];
  
  return { min: minLightness, max: maxLightness };
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
  
  // Convert hex strings back to chroma.Color objects
  console.time('Color Object Conversion');
  luminancePalette = luminancePalette.map(hex => chroma(hex));
  huePalette = huePalette.map(hex => chroma(hex));
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
      const percentage = Math.round((pixelCount / totalPixels) * 100);
      
      matchedPaletteStats.push({
        index: bucketIndex,
        percentage: percentage
      });
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
  // Calculate luminance range of input image
  const inputRange = calculateLuminanceRange(
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
 * Process hues and apply colors in a single pass
 */
function processHuesAndApplyColors(luminanceAdjustedArray, luminancePalette, huePalette, settings) {
  // Create a counter for each hue palette color
  const paletteBuckets = new Array(huePalette.length).fill(0);
  const processedArray = new Array(luminanceAdjustedArray.length);
  
  // Process each pixel
  luminanceAdjustedArray.forEach((pixel, index) => {
    const [h, , l] = pixel.hsl;
    
    // Convert to RGB to check grayscale
    const rgbColor = chroma.hsl(...pixel.hsl).rgb();
    
    // First check if the pixel is grayscale
    if (!isGrayScale(rgbColor, settings.grayscaleThreshold)) {
      // Only find closest hue for non-grayscale pixels
      const { color: closestColor, index: closestPaletteIndex } = findClosestHueColor(h, huePalette);
      const closestHsl = chroma(closestColor).hsl();
      
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
