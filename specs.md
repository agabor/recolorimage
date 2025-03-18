# Project Name: Recolor Images

## Description
A tool that transforms images by mapping their colors to a custom palette through a dual-processing approach: luminance mapping and color adjustment.

## Programming Stack
- **Language**: JavaScript
- **Framework**: Vue.js 3
- **Framework options**:
  - Composition API
- **Image Processing**:
  - Jimp (JavaScript Image Manipulation Program)
  - Chroma.js (Color manipulation library)
- **Clustering**:
  - ml-kmeans (https://www.npmjs.com/package/ml-kmeans)

## Recoloring Process
The application processes images in three stages:
1. **Luminance Mapping**: Creates an intermediate image where colors are mapped by luminance to the luminance palette
2. **Color Adjustment**: Creates an intermediate image where each pixel's color is adjusted based on the hue palette
3. **Blending**: Produces the final image as a per-pixel linear combination of the two intermediate images

## UI Specification

### Input Section
- Drag-and-drop image upload area
  - Shows preview of uploaded image
  - Displays file name and size
  - Supports common image formats (JPG, PNG, GIF, WEBP)
  - Fallback button for manual file selection

### Color Palette Section
- Two distinct palette components:
  - **Luminance Palette**: Displayed as a continuous gradient scale representing the tonal range from dark to light.
    Can contain any number of colors, but at least 2, explicitly, which are ordered by their luminance value. Palette colors are interpolated linearily between the explicit colors.
  - **Hue Palette**: Displayed as individual color swatches representing distinct hues for color mapping
- Default palette: Nord Theme
  - Luminance components: Polar Night (dark blue shades) and Snow Storm (light gray/white shades)
  - Hue components: Frost (blue accents) and Aurora (colorful accents)
- Option to select alternative pre-defined palettes
- Custom palette creation with color picker for both luminance gradient colors and individual hue colors

### Processing Controls
- "Recolor" button to process the image
- Processing options:
  - Color count slider for limiting palette size

### Output Section
- Display of processed image
- Download button for processed image
- Option to view intermediate processing steps (luminance mapped and hue adjusted versions)

### Additional UI Features
- Responsive design for desktop and mobile
- Progress indicator for processing large images

## Recoloring Process Detail

### Helper functions

#### grayScaleDistance
- **Params**:
    - An RGB color value
- **Process**:
  - Calculates the euclidean distance of the input color from its closest grayscale color.
- **Returns**:
  - The numerical distance.

#### isGrayScale
- **Params**:
    - An RGB color value
- **Constants**:
  - Threshold
- **Process**:
  - Determines wether the grayScaleDistance is lower than the threshold or not.
- **Returns**
  - True / False

#### hueDistance
- **Params**:
    - A HSL color value
    - The hue palette
- **Process**:
  - Calculates the difference of the hue value of the input color from the closest hue value on the hue palette.
- **Returns**:
  - The numerical difference (absolute value).

#### isHueOnPalette
- **Params**:
    - A HSL color value
    - The hue palette
- **Constants**:
  - Threshold
- **Process**:
  - Determines wether the hueDistance is lower than the Threshold or not.
- **Returns**
  - True / False

#### slDistance
- **Params**:
    - A HSL color value
    - The hue palette
- **Process**:
  - Calculates the minimal euclidean difference of the saturation and lightness value of the input color from the hue palette.
- **Returns**:
  - The numerical difference.

#### isSlOnPalette
- **Params**:
    - A HSL color value
    - The hue palette
- **Constants**:
  - Threshold
- **Process**:
  - Determines wether the slDistance is lower than the Threshold or not.
- **Returns**
  - True / False

#### isHueMappable
- **Params**:
    - A HSL color value
    - The hue palette
- **Returns**
  - !isGrayScale && isHueOnPalette && isSlOnPalette
 
#### blendFactor
- **Params**:
    - A HSL color value
    - The hue palette
- **Returns**
  - A linear combination of grayScaleDistance, hueDistance and slDistance

### Processing steps

#### 1. Image Preparation
- **Inputs**: 
  - Original image (user uploaded)
- **Process**:
  - Convert image to pixel array
  - Extract RGB values for each pixel
  - Convert RGB values to HSL (Hue, Saturation, Lightness) color space
- **Outputs**:
  - Original HSL image: Pixel array with HSL values
 
#### 2. Luminance level adjustment
- **Inputs**: 
  - Original HSL image: Pixel array with HSL values
  - Luminance palette
- **Process**:
  - Determine the luminance range of the input image
  - Determine the luminance range of the luminance palette
  - Adjust the luminance range of the input, by shifting and scaling the luminance values. Allow 5% outliers on each end (light and dark).
    If the luminance range of the input image is longer then the luminance palette range, scale it down.
    If the luminance range of the input image is shorter then the luminance palette range, do not scale it up, only shift it if necesarry.
- **Constants**:
    - Percentage of allowed outliers (default: 5%)
- **Outputs**:
  - Luminance adjusted image: Pixel array with HSL values

#### 3. Luminance Mapping
- **Inputs**:
  - Luminance adjusted image
  - Luminance palette
- **Process**:
  - For each pixel:
    - Extract lightness (L) value 
    - Look for the same lightness value on the luminance palette. Use linear interpolation to find color value for luminance levels that are in between explicit palette colors.
    - Use color chosen from luminance palette on output image.
- **Outputs**:
  - Luminance palette image: Pixel array with HSL values

#### 4. Hue Clastering
- **Inputs**:
  - Luminance adjusted image: Pixel array with HSL values
  - Hue palette (collection of distinct colors)
  - Number of hue classes
- **Process**:
  - Run K-means algorithm of the hue values of those pixels where isHueMappable returns true.
  - Map the hue value of each class to the closes hue palette color.
  - Calculate the average saturation level of each class, and calculate the ratio of it to the mapped colors saturation.
  - Calculate the average lightness level of each class, and calculate the ratio of it to the mapped colors lightness.
- **Outputs**:
  - Hue mapping: Mapping from hue values to the hue palette colors.
  - Saturation mapping: assigns a saturation scale factor to each class. Mapping keys are the same as in Hue mapping.
  - Lightness mapping: assigns a lightness scale factor to each class. Mapping keys are the same as in Hue mapping.

#### 5. Color Adjustment
- **Inputs**:
  - Hue mapping
  - Saturation mapping
  - Lightness mapping
- **Process**:
  - For each pixel:
    - Find the 2 closest matching hue in mapping keys
    - Replace original hue with the weighted average of the two mapped hue values.
    - Calculate the weighted average of the mapped saturation scale values, and apply it to the saturation channel.
    - Calculate the weighted average of the mapped lightness scale values, and apply it to the lightness channel.
- **Outputs**:
  - Color-adjusted pixel array

#### 6. Blending Stage
- **Inputs**:
  - Luminance-mapped pixel array
  - Color-adjusted pixel array
- **Process**:
  - For each pixel position:
    - Apply linear interpolation between luminance-mapped and color-adjusted pixels
    - Formula: FinalPixel = (LuminancePixel × (1-blendFactor)) + (HuePixel × blendFactor)
- **Outputs**:
  - Blended pixel array

#### 5. Output Generation
- **Inputs**:
  - Processed pixel array
- **Process**:
  - Reconstruct image from pixel array
  - Generate downloadable file
- **Outputs**:
  - Displayed image
  - Downloadable image file
- **Constants**:
  - Output file format (default: PNG)

### Processing Implementation Details
Implement all processing steps as Vue 3 composables.