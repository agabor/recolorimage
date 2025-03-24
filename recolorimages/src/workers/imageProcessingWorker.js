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
  
  // Step 3: Luminance Mapping
  console.time('Luminance Mapping');
  const luminanceMappedArray = mapLuminance(
    luminanceAdjustedArray,
    luminancePalette
  );
  console.timeEnd('Luminance Mapping');
  
  // Step 4: Combined Hue Processing and Color Application
  console.time('Hue Processing and Color Application');
  const { processedArray, paletteBuckets, selectedBucketIndices } = processHuesAndApplyColors(
    luminanceAdjustedArray,
    luminanceMappedArray,
    huePalette,
    settings
  );
  console.timeEnd('Hue Processing and Color Application');
  
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
      const pixelCount = paletteBuckets[bucketIndex].length;
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
    const [, , l] = pixel.hsl;
    
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
 * Process hues and apply colors in a single pass
 */
function processHuesAndApplyColors(luminanceAdjustedArray, luminanceMappedArray, huePalette, settings) {
  // Create a bucket for each hue palette color
  const paletteBuckets = Array(huePalette.length).fill().map(() => []);
  const processedArray = new Array(luminanceAdjustedArray.length);
  
  // Process each pixel
  luminanceAdjustedArray.forEach((pixel, index) => {
    const [h] = pixel.hsl;
    const luminanceMappedPixel = luminanceMappedArray[index];
    
    // Convert to RGB to check grayscale
    const rgbColor = chroma.hsl(...pixel.hsl).rgb();
    
    // Find the closest hue in the palette
    const { color: closestColor, index: closestPaletteIndex } = colorUtils.findClosestHueColor(h, huePalette);
    const closestHsl = chroma(closestColor).hsl();
    const hueDistance = colorUtils.hueDistance(pixel.hsl, [closestColor]);
    
    // Check if the color should be mapped based on thresholds
    if (!colorUtils.isGrayScale(rgbColor, settings.grayscaleThreshold) && 
        hueDistance < settings.hueThreshold) {
      // Add pixel to appropriate bucket for statistics
      paletteBuckets[closestPaletteIndex].push(pixel);
      
      // Get mapped hue and saturation from closest palette color
      const mappedHue = closestHsl[0];
      const mappedSaturation = closestHsl[1];
      
      // Use the luminance value from the luminance-mapped pixel
      const luminanceValue = luminanceMappedPixel.hsl[2];
      
      processedArray[index] = {
        ...pixel,
        hsl: [mappedHue, mappedSaturation, luminanceValue]
      };
    } else {
      // If color doesn't meet threshold criteria, use luminance-mapped color
      processedArray[index] = luminanceMappedPixel;
    }
  });
  
  // Sort buckets by number of pixels (descending) for statistics
  const bucketIndices = Array.from({ length: huePalette.length }, (_, i) => i);
  bucketIndices.sort((a, b) => paletteBuckets[b].length - paletteBuckets[a].length);
  
  // Take only the non-empty buckets
  const selectedBucketIndices = bucketIndices.filter(index => paletteBuckets[index].length > 0);
  
  return { processedArray, paletteBuckets, selectedBucketIndices };
}
