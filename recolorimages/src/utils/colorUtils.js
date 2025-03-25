/**
 * Color utility functions for image processing
 */
import chroma from 'chroma-js';

// Ensure chroma is available
if (!chroma) {
  console.error('Chroma.js is not available');
}

/**
 * Determine if a hue is close to a palette hue
 * @param {Array} hslColor - HSL color value [h, s, l]
 * @param {Array} huePalette - Array of hue palette colors
 * @param {Number} threshold - Threshold value in degrees (default: 15)
 * @returns {Boolean} - True if hue is close to a palette hue
 */
export function isHueOnPalette(hslColor, huePalette, threshold = 60) {
  const hue = hslColor[0];
  
  // Find minimum distance to any palette hue
  const hueDistance = Math.min(...huePalette.map(paletteColor => {
    const paletteHue = chroma(paletteColor).get('hsl.h') || 0;
    
    // Calculate hue distance considering the circular nature of hue (0-360)
    let distance = Math.abs(hue - paletteHue);
    if (distance > 180) {
      distance = 360 - distance;
    }
    
    return distance;
  }));
  
  return hueDistance < threshold;
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
