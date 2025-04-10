# Image Recolor

Recolor images online to fit your website's color scheme! Upload any image, set your websites color palette, and hit recolor.

# Luminance and Hue Palette

s you can see in the app we use two separate palettes for coloring the image, the luminance (or grayscale) and the hue (or color) palette. The recoloring process adjusts the lightness of each pixel to the luminance palette, and the color will be adjusted based on the hue palette. Pixels that do not have a matching color (within a threshold) on the hue palette will be left grayscale. The term grayscale might be a bit missleading, as the luminance palette can have a color component (for example [Sepia](https://en.wikipedia.org/wiki/Sepia_(color))) if tha lightness value varies.

# Improving the result
If you have recolored an image and you are not completly satisfied with the result, you can try disablein colors from your hue palette by clicking on them. This will force the algorithm to use an other color instead.