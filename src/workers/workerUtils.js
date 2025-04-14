/**
 * Utility functions for the image processing worker
 */

/**
 * Convert RGB to HSL
 * @param {Array} rgb - RGB color value [r, g, b] (0-255 range)
 * @returns {Array} - HSL color value [h, s, l]
 */
export function rgbToHsl(rgb) {
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
 * Convert a hex color string to HSL
 * @param {String} hex - Hex color string (e.g., "#FF0000")
 * @returns {Array} - HSL color value [h, s, l]
 */
export function hexToHsl(hex) {
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
 * Calculate the luminance range of an image
 * @param {Array} hslImage - Array of HSL pixel values
 * @param {Number} outlierPercentage - Percentage of outliers to exclude (default: 5)
 * @returns {Object} - Object containing min and max luminance values
 */
export function calculateLuminanceRange(hslImage, outlierPercentage = 5) {
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
 * Adjust the luminance range of an HSL image
 * @param {Array} hslArray - Array of HSL pixel objects
 * @param {Array} luminancePalette - Array of colors ordered by luminance
 * @param {Number} outlierPercentage - Percentage of outliers to exclude
 * @returns {Array} - Array of HSL pixel objects with adjusted luminance
 */
export function adjustLuminanceRange(hslArray, luminancePalette, outlierPercentage) {
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
