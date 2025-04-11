# Recolor Image - User Guide

Recolor images online to match your website's color scheme! Simply upload any image, select your color palette, and click the recolor button.

## How It Works

The app uses two separate color palettes to transform your images:

1. **Luminance Palette** - Controls the brightness levels in your image
2. **Hue Palette** - Determines the actual colors used in your image

When you recolor an image, the app adjusts each pixel in two ways:
- The brightness of each pixel is mapped to your luminance palette
- The color of each pixel is matched to the closest color in your hue palette

Pixels that don't closely match any color in your hue palette will use colors from the luminance palette instead. Note that the luminance palette can include color variations (like [Sepia](https://en.wikipedia.org/wiki/Sepia_(color))), not just pure grayscale.

## Color Palettes

You have several options for selecting color palettes:

1. **Built-in Palettes** - Choose from pre-defined themes like Nord, Solarized, and Monokai
2. **Custom Palettes** - Create your own palettes using color pickers
3. **WordPress Import** - Import color palettes directly from any WordPress site

## Improving Your Results

If you're not completely satisfied with how your image looks after recoloring, try these tips:

- **Disable specific colors**: Click on any color in your hue palette to disable it. This forces the app to use other colors instead.
- **Adjust the advanced settings**: Fine-tune the recoloring process using the advanced options described below.
- **Import WordPress palettes**: Use the "Import from WordPress" button to fetch color palettes from any WordPress site. This is especially useful for matching your site's theme colors.

## Advanced Settings

Click the "Show Advanced Settings" button below the color palettes to access these options:

### Hue Threshold (degrees)
Controls how closely a pixel's color must match your hue palette to use that color.

- **Higher values** (up to 180°): More pixels will match your hue palette colors, creating more colorful images
- **Lower values** (closer to 1°): Requires closer color matches, resulting in more grayscale areas
- **Default**: 60°

### Grayscale Threshold
Determines which pixels are treated as having no color (grayscale).

- **Higher values**: More pixels are treated as grayscale, even somewhat colorful ones
- **Lower values**: Only truly gray/black/white pixels are treated as grayscale
- **Default**: 30

### Use Luminance Palette Only
When enabled, this option ignores the hue palette completely.

- Creates monochromatic or duotone effects
- The image will follow only the color scheme of your luminance palette
- All original color information is discarded
- Useful for creating stylized, limited-color images

## WordPress Palette Import

The WordPress palette import feature allows you to use color palettes from any WordPress site in your recolored images. This is especially useful for matching your recolored images to your website's theme.

### How to Import WordPress Palettes

1. Click the "Import from WordPress" button in the palette selection area
2. Enter the URL of any WordPress site (e.g., `https://example.com`)
3. Click "Fetch Palettes" to retrieve the color palettes from the site
4. Select one or more palettes for the luminance palette and click "Continue to Hue Selection"
5. Select individual colors for the hue palette
6. Click "Use Selected Palettes" to apply the imported palettes to your image

### How It Works

The feature extracts color variables from the WordPress site's CSS and groups them into palettes based on naming patterns. It looks for numbered color series (like `primary-0`, `primary-1`, etc.) and organizes them into separate palettes.

For the luminance palette, you can select entire palettes which will be sorted from dark to light. For the hue palette, you can select individual colors from all available colors on the site.
