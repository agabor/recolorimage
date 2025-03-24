/**
 * Color utility functions for image processing
 */
import chroma from 'chroma-js';

// Ensure chroma is available
if (!chroma) {
  console.error('Chroma.js is not available');
}

/**
 * Calculate the Euclidean distance between a color and its grayscale equivalent
 * @param {Array} rgbColor - RGB color value [r, g, b]
 * @returns {Number} - Distance from closest grayscale color
 */
export function grayScaleDistance(rgbColor) {
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
export function isGrayScale(rgbColor, threshold = 0.3) {
  return grayScaleDistance(rgbColor) < threshold;
}

/**
 * Calculate the minimum absolute difference between input hue and any palette hue
 * @param {Array} hslColor - HSL color value [h, s, l]
 * @param {Array} huePalette - Array of hue palette colors
 * @returns {Number} - Minimum absolute difference between hues
 */
export function hueDistance(hslColor, huePalette) {
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
 * Determine if a hue is close to a palette hue
 * @param {Array} hslColor - HSL color value [h, s, l]
 * @param {Array} huePalette - Array of hue palette colors
 * @param {Number} threshold - Threshold value in degrees (default: 15)
 * @returns {Boolean} - True if hue is close to a palette hue
 */
export function isHueOnPalette(hslColor, huePalette, threshold = 60) {
  return hueDistance(hslColor, huePalette) < threshold;
}

/**
 * Convert RGB to HSL
 * @param {Array} rgb - RGB color value [r, g, b]
 * @returns {Array} - HSL color value [h, s, l]
 */
export function rgbToHsl(rgb) {
  return chroma(rgb).hsl();
}

/**
 * Convert HSL to RGB
 * @param {Array} hsl - HSL color value [h, s, l]
 * @returns {Array} - RGB color value [r, g, b]
 */
export function hslToRgb(hsl) {
  return chroma.hsl(...hsl).rgb();
}

/**
 * Find the closest color in a palette to a given lightness value
 * @param {Number} lightness - Lightness value (0-1)
 * @param {Array} luminancePalette - Array of colors ordered by luminance
 * @returns {Array} - RGB color from the palette
 */
export function findClosestLuminanceColor(lightness, luminancePalette) {
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
export function findClosestHueColor(hue, huePalette) {
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
 * Default color palettes
 */
export const DEFAULT_PALETTES = {
  // Nord Theme
  nord: {
    luminance: [
      chroma('#2E3440'), // Polar Night (darkest)
      chroma('#3B4252'),
      chroma('#434C5E'),
      chroma('#4C566A'),
      chroma('#D8DEE9'), // Snow Storm (lightest)
      chroma('#E5E9F0'),
      chroma('#ECEFF4')
    ],
    hue: [
      chroma('#8FBCBB'), // Frost (blue accents)
      chroma('#88C0D0'),
      chroma('#81A1C1'),
      chroma('#5E81AC'),
      chroma('#BF616A'), // Aurora (colorful accents)
      chroma('#D08770'),
      chroma('#EBCB8B'),
      chroma('#A3BE8C'),
      chroma('#B48EAD')
    ]
  },
  // Solarized Theme
  solarized: {
    luminance: [
      chroma('#002b36'), // base03 (darkest)
      chroma('#073642'), // base02
      chroma('#586e75'), // base01
      chroma('#657b83'), // base00
      chroma('#839496'), // base0
      chroma('#93a1a1'), // base1
      chroma('#eee8d5'), // base2
      chroma('#fdf6e3')  // base3 (lightest)
    ],
    hue: [
      chroma('#b58900'), // yellow
      chroma('#cb4b16'), // orange
      chroma('#dc322f'), // red
      chroma('#d33682'), // magenta
      chroma('#6c71c4'), // violet
      chroma('#268bd2'), // blue
      chroma('#2aa198'), // cyan
      chroma('#859900')  // green
    ]
  },
  // Monokai Theme
  monokai: {
    luminance: [
      chroma('#272822'), // background (darkest)
      chroma('#3E3D31'),
      chroma('#75715E'),
      chroma('#CFCFC2'),
      chroma('#F8F8F2')  // foreground (lightest)
    ],
    hue: [
      chroma('#F92672'), // pink
      chroma('#FD971F'), // orange
      chroma('#E6DB74'), // yellow
      chroma('#A6E22E'), // green
      chroma('#66D9EF'), // blue
      chroma('#AE81FF')  // purple
    ]
  }
};
