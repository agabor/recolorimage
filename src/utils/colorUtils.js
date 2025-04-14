/**
 * Extracts colors from a CSS gradient string
 * @param {string} gradientStr - CSS gradient string
 * @returns {Array} Array of extracted colors
 */
function extractColorsFromGradient(gradientStr) {
  console.log('Extracting colors from gradient:', gradientStr);
  
  // Match all color definitions in the gradient
  // This regex matches both rgba() and rgb() formats as well as hex colors
  const colorRegex = /(rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[\d.]+\s*)?\)|#[A-Fa-f0-9]{3,8})/g;
  const colors = [];
  let match;
  
  while ((match = colorRegex.exec(gradientStr)) !== null) {
    colors.push(match[1]);
  }
  
  console.log('Extracted colors:', colors);
  return colors;
}

/**
 * Converts a color string (rgb, rgba, hex) to a hex color
 * @param {string} colorStr - Color string
 * @returns {string} Hex color
 */
function colorToHex(colorStr) {
  // If it's already a hex color, return it
  if (colorStr.startsWith('#')) {
    // Ensure it's a 6-digit hex
    if (colorStr.length === 4) {
      // Convert #RGB to #RRGGBB
      return `#${colorStr[1]}${colorStr[1]}${colorStr[2]}${colorStr[2]}${colorStr[3]}${colorStr[3]}`;
    }
    return colorStr;
  }
  
  // Handle rgb/rgba format
  const rgbMatch = colorStr.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]);
    const g = parseInt(rgbMatch[2]);
    const b = parseInt(rgbMatch[3]);
    
    // Convert to hex
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
  
  // If we can't parse it, return a default color
  return '#000000';
}

/**
 * Calculates the luminance of a color
 * @param {string} hexColor - Hex color
 * @returns {number} Luminance value (0-1)
 */
function calculateLuminance(hexColor) {
  // Remove # if present
  hexColor = hexColor.replace(/^#/, '');
  
  // Parse the hex values
  let r, g, b;
  if (hexColor.length === 3) {
    // Short hex format (#RGB)
    r = parseInt(hexColor.charAt(0) + hexColor.charAt(0), 16) / 255;
    g = parseInt(hexColor.charAt(1) + hexColor.charAt(1), 16) / 255;
    b = parseInt(hexColor.charAt(2) + hexColor.charAt(2), 16) / 255;
  } else {
    // Full hex format (#RRGGBB)
    r = parseInt(hexColor.substring(0, 2), 16) / 255;
    g = parseInt(hexColor.substring(2, 4), 16) / 255;
    b = parseInt(hexColor.substring(4, 6), 16) / 255;
  }
  
  // Calculate relative luminance using the sRGB color space formula
  // https://www.w3.org/TR/WCAG20/#relativeluminancedef
  r = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  g = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  b = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
  
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Checks if a gradient qualifies as a luminance palette
 * @param {Array} colors - Array of colors in the gradient
 * @returns {Object} Object with isLuminancePalette flag and sortedColors array
 */
function checkGradientLuminance(colors) {
  console.log('\nChecking if gradient qualifies as luminance palette');
  console.log('Number of colors:', colors.length);
  
  if (colors.length < 2) {
    console.log('Not enough colors (minimum 2 required)');
    return { isLuminancePalette: false, sortedColors: [] };
  }
  
  // Convert colors to hex and calculate luminance
  const colorsWithLuminance = colors.map((color, index) => {
    const hex = colorToHex(color);
    const luminance = calculateLuminance(hex);
    console.log(`Color ${index+1}: ${color} -> Hex: ${hex} -> Luminance: ${luminance.toFixed(4)}`);
    return {
      color: hex,
      luminance: luminance,
      originalIndex: index
    };
  });
  
  // Calculate luminance range
  const luminances = colorsWithLuminance.map(c => c.luminance);
  const minLuminance = Math.min(...luminances);
  const maxLuminance = Math.max(...luminances);
  const luminanceRange = maxLuminance - minLuminance;
  
  console.log(`Min luminance: ${minLuminance.toFixed(4)}`);
  console.log(`Max luminance: ${maxLuminance.toFixed(4)}`);
  console.log(`Luminance range: ${luminanceRange.toFixed(4)}`);
  
  // Check if there's a significant difference in lightness (at least 0.3)
  const SIGNIFICANT_DIFFERENCE = 0.3;
  const hasSignificantDifference = luminanceRange >= SIGNIFICANT_DIFFERENCE;
  
  console.log(`Significant difference threshold: ${SIGNIFICANT_DIFFERENCE}`);
  console.log(`Has significant luminance difference: ${hasSignificantDifference}`);
  
  // Check if colors are ordered by luminance (either dark to light or light to dark)
  let isOrdered = true;
  let isAscending = null;
  
  // Need at least 2 colors to check ordering
  if (colors.length >= 2) {
    // Determine direction based on first two colors
    isAscending = colorsWithLuminance[1].luminance > colorsWithLuminance[0].luminance;
    console.log(`Gradient direction: ${isAscending ? 'Dark to light' : 'Light to dark'}`);
    
    // Check if all colors follow the same direction
    for (let i = 1; i < colorsWithLuminance.length; i++) {
      const prev = colorsWithLuminance[i-1].luminance;
      const curr = colorsWithLuminance[i].luminance;
      
      if ((isAscending && curr < prev) || (!isAscending && curr > prev)) {
        isOrdered = false;
        break;
      }
    }
  }
  
  console.log(`Colors are ordered by luminance: ${isOrdered}`);
  
  // A gradient qualifies as a luminance palette if it has significant difference in lightness
  // and colors are ordered by luminance (either dark to light or light to dark)
  const isLuminancePalette = hasSignificantDifference && isOrdered;
  console.log(`Is luminance palette: ${isLuminancePalette}`);
  
  // Sort colors by luminance (dark to light)
  const sortedColors = [...colorsWithLuminance].sort((a, b) => a.luminance - b.luminance);
  
  console.log('Sorted colors by luminance (dark to light):');
  sortedColors.forEach((c, i) => {
    console.log(`  ${i+1}. ${c.color} (${c.luminance.toFixed(4)})`);
  });
  
  return {
    isLuminancePalette,
    hasSignificantDifference,
    isOrdered,
    sortedColors: sortedColors.map(c => c.color)
  };
}

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
 * Fetches and parses WordPress color palettes from a given URL
 * @param {string} url - WordPress site URL
 * @returns {Promise<Object>} Object containing numbered sub-palettes and all colors
 */
export async function fetchWordPressColorPalettes(url) {
  try {
    // Use WordPress plugin's proxy endpoint
    const proxyUrl = `https://recolorimage.com/wp-admin/admin-ajax.php?action=fetch_wp_styles&url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.data || 'Failed to fetch WordPress styles');
    }
    
    const html = data.data.html;
    
    // Find the global styles CSS
    const styleMatch = html.match(/<style id='global-styles-inline-css'(?:\s+type='text\/css')?>([\s\S]*?)<\/style>/);
    if (!styleMatch) {
      throw new Error('Global styles not found');
    }
    
    const css = styleMatch[1];
    
    // Extract color variables
    const colorVars = {};
    const varRegex = /--wp--preset--color--([\w-]+):\s*(#[A-Fa-f0-9]{6})/g;
    let match;
    
    while ((match = varRegex.exec(css)) !== null) {
      colorVars[match[1]] = match[2];
    }
    
    // Extract gradient variables
    const gradientVars = {};
    // Use a more robust regex that handles nested parentheses in gradients
    const gradientRegex = /--wp--preset--gradient--([\w-]+):\s*(linear-gradient\((?:[^)(]+|\((?:[^)(]+|\([^)(]*\))*\))*\))/g;
    let gradientMatch;
    
    console.log('\n=== PROCESSING WORDPRESS GRADIENTS ===');
    let gradientCount = 0;
    let qualifiedCount = 0;
    
    while ((gradientMatch = gradientRegex.exec(css)) !== null) {
      gradientCount++;
      const gradientName = gradientMatch[1];
      const gradientValue = gradientMatch[2];
      
      console.log(`\nGradient #${gradientCount}: ${gradientName}`);
      console.log(`Value: ${gradientValue}`);
      
      // Extract colors from the gradient
      const gradientColors = extractColorsFromGradient(gradientValue);
      
      // Check if the gradient qualifies as a luminance palette
      const { isLuminancePalette, hasSignificantDifference, isOrdered, sortedColors } = checkGradientLuminance(gradientColors);
      
      if (isLuminancePalette && sortedColors.length >= 2) {
        console.log(`✅ Gradient "${gradientName}" QUALIFIES as a luminance palette`);
        qualifiedCount++;
        gradientVars[gradientName] = sortedColors;
      } else {
        console.log(`❌ Gradient "${gradientName}" does NOT qualify as a luminance palette`);
        if (sortedColors.length < 2) {
          console.log('   Reason: Not enough colors (minimum 2 required)');
        } else if (!hasSignificantDifference) {
          console.log('   Reason: Not enough luminance difference');
        } else if (!isOrdered) {
          console.log('   Reason: Colors are not ordered by luminance');
        }
      }
    }
    
    console.log(`\n=== GRADIENT SUMMARY ===`);
    console.log(`Total gradients found: ${gradientCount}`);
    console.log(`Qualified as luminance palettes: ${qualifiedCount}`);
    console.log(`Rejected: ${gradientCount - qualifiedCount}`);
    
    // Group numbered sub-palettes
    const subPalettes = {};
    Object.entries(colorVars).forEach(([name, color]) => {
      // Look for patterns like 'something-0', 'something-1', 'something-10', etc.
      const match = name.match(/(.*?)-(\d+)$/);
      if (match) {
        const [, baseName, index] = match;
        if (!subPalettes[baseName]) {
          subPalettes[baseName] = {};
        }
        // Use object instead of array to handle sparse numbering
        subPalettes[baseName][parseInt(index)] = color;
      }
    });
    
    // Filter out incomplete palettes
    const validPalettes = {};
    Object.entries(subPalettes).forEach(([name, colors]) => {
      // Convert object to array, preserving sparse numbering
      const colorEntries = Object.entries(colors);
      
      // Only keep palettes with at least 2 colors
      if (colorEntries.length >= 2) {
        // Sort by index (numeric)
        colorEntries.sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
        
        // Create a new array with the correct indices
        validPalettes[name] = colorEntries.map(entry => entry[1]);
      }
    });
    
    // Add gradient palettes
    Object.entries(gradientVars).forEach(([name, colors]) => {
      validPalettes[`gradient-${name}`] = colors;
    });
    
    // Add all colors as a special palette
    validPalettes['all-colors'] = Object.values(colorVars);
    
    return validPalettes;
  } catch (error) {
    throw new Error(`Failed to fetch WordPress palettes: ${error.message}`);
  }
}

/**
 * Default color palettes
 */
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

export const DEFAULT_PALETTES = {
  // WordPress Theme
  wordpress: {
    luminance: [
      '#000000', // black
      '#111',    // dark-gray
      '#22313f', // blue-gray
      '#abb8c3', // cyan-bluish-gray
      '#f1f1f1', // light-gray
      '#fff'     // white
    ],
    hue: [
      '#cf2e2e',   // vivid-red
      '#ff6900',   // luminous-vivid-orange
      '#fcb900',   // luminous-vivid-amber
      '#f4ca16',   // yellow
      '#00d084',   // vivid-green-cyan
      '#0693e3',   // vivid-cyan-blue
      '#9b51e0',   // vivid-purple
      '#e53b51'   // medium-pink
    ]
  },
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
