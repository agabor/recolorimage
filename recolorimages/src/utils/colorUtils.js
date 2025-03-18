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
export function isGrayScale(rgbColor, threshold = 0.1) {
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
export function isHueOnPalette(hslColor, huePalette, threshold = 15) {
  return hueDistance(hslColor, huePalette) < threshold;
}

/**
 * Calculate the minimum Euclidean distance between [s,l] and any palette color's [s,l]
 * @param {Array} hslColor - HSL color value [h, s, l]
 * @param {Array} huePalette - Array of hue palette colors
 * @returns {Number} - Minimum distance between saturation-lightness pairs
 */
export function slDistance(hslColor, huePalette) {
  const s = hslColor[1];
  const l = hslColor[2];
  
  // Find minimum distance to any palette color's saturation and lightness
  return Math.min(...huePalette.map(paletteColor => {
    const paletteHsl = chroma(paletteColor).get('hsl');
    const paletteS = paletteHsl[1] || 0;
    const paletteL = paletteHsl[2] || 0;
    
    // Calculate Euclidean distance in the SL plane
    return Math.sqrt(
      Math.pow(s - paletteS, 2) +
      Math.pow(l - paletteL, 2)
    );
  }));
}

/**
 * Determine if [s,l] is close to a palette color's [s,l]
 * @param {Array} hslColor - HSL color value [h, s, l]
 * @param {Array} huePalette - Array of hue palette colors
 * @param {Number} threshold - Threshold value (default: 0.2)
 * @returns {Boolean} - True if [s,l] is close to a palette color's [s,l]
 */
export function isSlOnPalette(hslColor, huePalette, threshold = 0.2) {
  return slDistance(hslColor, huePalette) < threshold;
}

/**
 * Determine if a color can be mapped to the hue palette
 * @param {Array} hslColor - HSL color value [h, s, l]
 * @param {Array} huePalette - Array of hue palette colors
 * @returns {Boolean} - True if color can be mapped to hue palette
 */
export function isHueMappable(hslColor, huePalette) {
  const rgbColor = chroma.hsl(...hslColor).rgb();
  return !isGrayScale(rgbColor) && 
         isHueOnPalette(hslColor, huePalette) && 
         isSlOnPalette(hslColor, huePalette);
}

/**
 * Calculate a blend factor determining the blend ratio
 * @param {Array} hslColor - HSL color value [h, s, l]
 * @param {Array} huePalette - Array of hue palette colors
 * @returns {Number} - Value between 0 and 1 determining blend ratio
 */
export function blendFactor(hslColor, huePalette) {
  const rgbColor = chroma.hsl(...hslColor).rgb();
  
  // Calculate normalized distances
  const grayDist = grayScaleDistance(rgbColor) / 255;
  const hueDist = hueDistance(hslColor, huePalette) / 180;
  const slDist = slDistance(hslColor, huePalette);
  
  // Weighted combination of distances
  // Higher weight for grayscale distance (more important)
  const weightedDist = 0.5 * grayDist + 0.3 * (1 - hueDist) + 0.2 * (1 - slDist);
  
  // Ensure result is between 0 and 1
  return Math.max(0, Math.min(1, weightedDist));
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
    return chroma(luminancePalette[lowerIndex]).rgb();
  }
  
  if (lightness >= paletteLightness[paletteLightness.length - 1]) {
    return chroma(luminancePalette[upperIndex]).rgb();
  }
  
  // Linear interpolation between the two closest colors
  const lowerL = paletteLightness[lowerIndex];
  const upperL = paletteLightness[upperIndex];
  const ratio = (lightness - lowerL) / (upperL - lowerL);
  
  const lowerColor = chroma(luminancePalette[lowerIndex]);
  const upperColor = chroma(luminancePalette[upperIndex]);
  
  return chroma.mix(lowerColor, upperColor, ratio, 'hsl').rgb();
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
      '#2E3440', // Polar Night (darkest)
      '#3B4252',
      '#434C5E',
      '#4C566A',
      '#D8DEE9', // Snow Storm (lightest)
      '#E5E9F0',
      '#ECEFF4'
    ],
    hue: [
      '#8FBCBB', // Frost (blue accents)
      '#88C0D0',
      '#81A1C1',
      '#5E81AC',
      '#BF616A', // Aurora (colorful accents)
      '#D08770',
      '#EBCB8B',
      '#A3BE8C',
      '#B48EAD'
    ]
  },
  // Solarized Theme
  solarized: {
    luminance: [
      '#002b36', // base03 (darkest)
      '#073642', // base02
      '#586e75', // base01
      '#657b83', // base00
      '#839496', // base0
      '#93a1a1', // base1
      '#eee8d5', // base2
      '#fdf6e3'  // base3 (lightest)
    ],
    hue: [
      '#b58900', // yellow
      '#cb4b16', // orange
      '#dc322f', // red
      '#d33682', // magenta
      '#6c71c4', // violet
      '#268bd2', // blue
      '#2aa198', // cyan
      '#859900'  // green
    ]
  },
  // Monokai Theme
  monokai: {
    luminance: [
      '#272822', // background (darkest)
      '#3E3D31',
      '#75715E',
      '#CFCFC2',
      '#F8F8F2'  // foreground (lightest)
    ],
    hue: [
      '#F92672', // pink
      '#FD971F', // orange
      '#E6DB74', // yellow
      '#A6E22E', // green
      '#66D9EF', // blue
      '#AE81FF'  // purple
    ]
  }
};
