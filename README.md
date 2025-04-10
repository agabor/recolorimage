# Image Recolor

Recolor images online to fit your website's color scheme! Upload any image, set your websites color palette, and hit recolor.

# Luminance and Hue Palette

s you can see in the app we use two separate palettes for coloring the image, the luminance (or grayscale) and the hue (or color) palette. The recoloring process adjusts the lightness of each pixel to the luminance palette, and the color will be adjusted based on the hue palette. Pixels that do not have a matching color (within a threshold) on the hue palette will be left grayscale. The term grayscale might be a bit missleading, as the luminance palette can have a color component (for example [Sepia](https://en.wikipedia.org/wiki/Sepia_(color))) if tha lightness value varies.

# Improving the result
If you have recolored an image and you are not completly satisfied with the result, you can try disablein colors from your hue palette by clicking on them. This will force the algorithm to use an other color instead.

# Advanced Settings

The application provides advanced settings that allow you to fine-tune the recoloring process:

## Hue Threshold (degrees)
This setting controls how close a pixel's hue needs to be to a color in your hue palette to be considered a match. 
- Higher values (up to 180°) will match more pixels to your hue palette colors, resulting in more colorful images
- Lower values (closer to 1°) require more exact matches, resulting in fewer colored pixels and more grayscale areas
- Default: 60°

## Grayscale Threshold
This determines how colorful a pixel needs to be to not be considered grayscale.
- Higher values treat more pixels as grayscale (even somewhat colorful ones)
- Lower values only treat truly gray/black/white pixels as grayscale
- Default: 30

## Use Luminance Palette Only
When enabled, this option maps all pixels to your luminance palette without using the hue palette.
- Useful for creating monochromatic or duotone effects
- The resulting image will follow the color scheme of your luminance palette
- All color information from the original image is discarded

To access these settings, click the "Show Advanced Settings" button below the color palettes.
