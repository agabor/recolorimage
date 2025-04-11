

/**
 * Fetches and parses WordPress color palettes from a given URL
 * @param {string} url - WordPress site URL
 * @returns {Promise<Object>} Object containing numbered sub-palettes
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
    const styleMatch = html.match(/<style id='global-styles-inline-css'>([\s\S]*?)<\/style>/);
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
    
    // Group numbered sub-palettes
    const subPalettes = {};
    Object.entries(colorVars).forEach(([name, color]) => {
      // Look for patterns like 'something-0', 'something-1', etc.
      const match = name.match(/(.*?)-(\d+)$/);
      if (match) {
        const [, baseName, index] = match;
        if (!subPalettes[baseName]) {
          subPalettes[baseName] = [];
        }
        subPalettes[baseName][parseInt(index)] = color;
      }
    });
    
    // Filter out incomplete palettes and sort colors
    const validPalettes = {};
    Object.entries(subPalettes).forEach(([name, colors]) => {
      // Remove sparse arrays and ensure sequential numbering
      const validColors = colors.filter(Boolean);
      if (validColors.length === colors.length && validColors.length >= 2) {
        validPalettes[name] = validColors;
      }
    });
    
    return validPalettes;
  } catch (error) {
    throw new Error(`Failed to fetch WordPress palettes: ${error.message}`);
  }
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
