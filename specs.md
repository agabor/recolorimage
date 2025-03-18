# Recolor Images: Technical Specification

## Project Overview
A Vue.js application that transforms images by mapping their colors to a custom palette using a dual-processing approach: luminance mapping and color adjustment.

## Technology Stack
- **Frontend Framework**: Vue.js 3 with Composition API
- **Image Processing Libraries**:
  - Jimp (JavaScript Image Manipulation Program) for pixel-level image manipulation
  - Chroma.js for color space conversions and manipulations
- **Color Analysis**:
  - ml-kmeans for color clustering (https://www.npmjs.com/package/ml-kmeans)
- **Build Tool**: Vite (as indicated by project structure)

## Application Structure
Implement all processing steps as Vue 3 composables for modularity and reusability.

## User Interface Components

### 1. Image Upload Component
- Drag-and-drop area for image upload
- Preview of uploaded image with file name and size display
- Supported formats: JPG, PNG
- Fallback button for manual file selection

### 2. Color Palette Components
- **Luminance Palette**:
  - Displayed as a continuous gradient from dark to light
  - Minimum of 2 colors, ordered by luminance value
  - Colors between explicit points are linearly interpolated
  
- **Hue Palette**:
  - Displayed as individual color swatches
  - Represents distinct hues for color mapping

- **Palette Selection**:
  - Default: Nord Theme
    - Luminance: Polar Night (dark blues) to Snow Storm (light grays/whites)
    - Hue: Frost (blue accents) and Aurora (colorful accents)
  - Pre-defined alternative palettes
  - Custom palette creation with color pickers for both palette types

### 3. Processing Controls
- "Recolor" button to initiate processing
- Color count slider to limit palette size

### 4. Output Display
- Processed image display
- Download button for the processed image (PNG format)
- Toggle to view intermediate processing steps (luminance-mapped and hue-adjusted versions)

### 5. UI Features
- Responsive design for desktop and mobile
- Progress indicator for processing large images

## Color Processing Algorithm

### Helper Functions

#### 1. grayScaleDistance(rgbColor)
- **Input**: RGB color value [r, g, b]
- **Output**: Numerical distance from closest grayscale color
- **Implementation**: Calculate Euclidean distance between the color and its grayscale equivalent

#### 2. isGrayScale(rgbColor, threshold)
- **Input**: RGB color value [r, g, b], threshold value
- **Output**: Boolean (true if color is effectively grayscale)
- **Implementation**: Return true if grayScaleDistance < threshold

#### 3. hueDistance(hslColor, huePalette)
- **Input**: HSL color value [h, s, l], array of hue palette colors
- **Output**: Minimum absolute difference between input hue and any palette hue
- **Implementation**: Find minimum absolute difference between hue values

#### 4. isHueOnPalette(hslColor, huePalette, threshold)
- **Input**: HSL color value [h, s, l], hue palette, threshold value
- **Output**: Boolean (true if hue is close to a palette hue)
- **Implementation**: Return true if hueDistance < threshold

#### 5. slDistance(hslColor, huePalette)
- **Input**: HSL color value [h, s, l], hue palette
- **Output**: Minimum Euclidean distance between [s,l] and any palette color's [s,l]
- **Implementation**: Calculate minimum distance between saturation-lightness pairs

#### 6. isSlOnPalette(hslColor, huePalette, threshold)
- **Input**: HSL color value [h, s, l], hue palette, threshold value
- **Output**: Boolean (true if [s,l] is close to a palette color's [s,l])
- **Implementation**: Return true if slDistance < threshold

#### 7. isHueMappable(hslColor, huePalette)
- **Input**: HSL color value [h, s, l], hue palette
- **Output**: Boolean (true if color can be mapped to hue palette)
- **Implementation**: Return !isGrayScale(hslColor) && isHueOnPalette(hslColor, huePalette) && isSlOnPalette(hslColor, huePalette)

#### 8. blendFactor(hslColor, huePalette)
- **Input**: HSL color value [h, s, l], hue palette
- **Output**: Value between 0 and 1 determining blend ratio
- **Implementation**: Calculate weighted combination of grayScaleDistance, hueDistance, and slDistance

### Processing Pipeline

#### 1. Image Preparation
- **Input**: Original image file
- **Process**:
  - Convert image to pixel array
  - Convert RGB values to HSL color space for each pixel
- **Output**: Original HSL image (pixel array with HSL values)

#### 2. Luminance Range Adjustment
- **Input**: Original HSL image, luminance palette
- **Process**:
  - Determine luminance range of input image (allowing 5% outliers on each end)
  - Determine luminance range of luminance palette
  - If input range > palette range: scale down input range
  - If input range < palette range: shift input range to fit within palette range (no scaling up)
- **Output**: Luminance-adjusted HSL image

#### 3. Luminance Mapping
- **Input**: Luminance-adjusted HSL image, luminance palette
- **Process**:
  - For each pixel:
    - Extract lightness (L) value
    - Find corresponding color on luminance palette using linear interpolation
    - Replace pixel with palette color
- **Output**: Luminance-mapped image

#### 4. Hue Clustering
- **Input**: Luminance-adjusted HSL image, hue palette, number of hue classes
- **Process**:
  - Filter pixels where isHueMappable returns true
  - Run K-means clustering on hue values of filtered pixels
  - For each cluster:
    - Map cluster center hue to closest hue in palette
    - Calculate average saturation and lightness of cluster
    - Calculate saturation and lightness scale factors relative to mapped palette color
- **Output**:
  - Hue mapping: Map from cluster centers to palette hues
  - Saturation mapping: Map from cluster centers to saturation scale factors
  - Lightness mapping: Map from cluster centers to lightness scale factors

#### 5. Color Adjustment
- **Input**: Luminance-adjusted HSL image, hue/saturation/lightness mappings
- **Process**:
  - For each pixel:
    - Find two closest cluster centers
    - Calculate weighted average of mapped hues based on distance to cluster centers
    - Apply weighted average of saturation and lightness scale factors
- **Output**: Color-adjusted HSL image

#### 6. Blending
- **Input**: Luminance-mapped image, color-adjusted image
- **Process**:
  - For each pixel:
    - Calculate blend factor based on pixel properties
    - Apply linear interpolation: FinalPixel = (LuminancePixel × (1-blendFactor)) + (ColorAdjustedPixel × blendFactor)
- **Output**: Blended HSL image

#### 7. Output Generation
- **Input**: Blended HSL image
- **Process**:
  - Convert HSL values back to RGB
  - Reconstruct image from pixel array
- **Output**: Processed image (displayed and available for download as PNG)

## Implementation Notes

1. **Performance Considerations**:
   - Process images in a web worker to prevent UI freezing
   - Implement progress tracking for each processing step

2. **Error Handling**:
   - Validate image dimensions and file size before processing
   - Provide user feedback for processing errors

3. **Default Values**:
   - Grayscale threshold: 0.1
   - Hue distance threshold: 15 (in degrees)
   - SL distance threshold: 0.2
   - Outlier percentage: 5%
   - Default color count: 8

4. **Testing**:
   - Test with various image types and sizes
   - Verify color mapping accuracy with sample images
