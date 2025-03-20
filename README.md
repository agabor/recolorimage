# Recolor Images: Technical Specification

## Project Overview
A Vue.js application that transforms images by mapping their colors to a custom palette using a dual-processing approach: luminance mapping and color adjustment.

## Technology Stack
- **Frontend Framework**: Vue.js 3 with Composition API
- **Image Processing**:
  - HTML5 Canvas API for pixel-level image manipulation
  - Chroma.js for color space conversions and manipulations
- **Color Analysis**:
  - ml-kmeans for color clustering (https://www.npmjs.com/package/ml-kmeans)
- **Build Tool**: Vite (as indicated by project structure)

## Application Structure
Implement all processing steps as Vue 3 composables for modularity and reusability.

## User Interface Components

### 1. Image Upload Component
**Implemented in**: `recolorimages/src/components/ImageUploader.vue`
- Drag-and-drop area for image upload
- Preview of uploaded image with file name and size display
- Supported formats: JPG, PNG
- Fallback button for manual file selection

### 2. Color Palette Components
**Implemented in**: `recolorimages/src/components/ColorPalette.vue`
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
  - Pre-defined alternative palettes (defined in `recolorimages/src/utils/colorUtils.js`)
  - Custom palette creation with color pickers for both palette types

### 3. Processing Controls
**Implemented in**: `recolorimages/src/components/ProcessingControls.vue`
- "Recolor" button to initiate processing
- Color count slider to limit palette size
- Advanced settings for thresholds and parameters

### 4. Output Display
**Implemented in**: `recolorimages/src/components/OutputDisplay.vue`
- Processed image display
- Download button for the processed image (PNG format)
- Toggle to view intermediate processing steps (luminance-mapped and hue-adjusted versions)

### 5. UI Features
- Responsive design for desktop and mobile
- Progress indicator for processing all images

## Color Processing Algorithm

### Helper Functions
**Implemented in**: `recolorimages/src/utils/colorUtils.js`

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
**Implemented in**: 
- `recolorimages/src/composables/useImageProcessing.js` (main processing logic)
- `recolorimages/src/workers/imageProcessingWorker.js` (CPU-intensive processing in a Web Worker)

#### 1. Image Preparation
**Implemented in**: `useImageProcessing.js` (loadImage, createImageFromFile, createCanvasFromImage, getPixelData) and `imageProcessingWorker.js` (pixelDataToHslArray)
- **Input**: Original image file
- **Process**:
  - Convert image to pixel array
  - Convert RGB values to HSL color space for each pixel
- **Output**: Original HSL image (pixel array with HSL values)

#### 2. Luminance Range Adjustment
**Implemented in**: `imageProcessingWorker.js` (adjustLuminanceRange function)
- **Input**: Original HSL image, luminance palette
- **Process**:
  - Determine luminance range of input image (allowing 5% outliers on each end)
  - Determine luminance range of luminance palette
  - If input range > palette range: scale down input range
  - If input range < palette range: shift input range to fit within palette range (no scaling up)
- **Output**: Luminance-adjusted HSL image

#### 3. Luminance Mapping
**Implemented in**: `imageProcessingWorker.js` (mapLuminance function)
- **Input**: Luminance-adjusted HSL image, luminance palette
- **Process**:
  - For each pixel:
    - Extract lightness (L) value
    - Find corresponding color on luminance palette using linear interpolation
    - Replace pixel with palette color
- **Output**: Luminance-mapped image

#### 4. Hue Clustering
**Implemented in**: `imageProcessingWorker.js` (clusterHues function)
- **Input**: Luminance-adjusted HSL image, hue palette, number of hue classes
- **Process**:
  - Filter pixels where isHueMappable returns true
  - Run K-means clustering on hue values of filtered pixels
  - For each cluster:
    - Store the cluster centroid (average hue)
    - Find and store the minimum and maximum hue values in the cluster
    - Map cluster center hue to closest hue in palette
- **Output**:
  - Hue mapping: Map from cluster centers to palette hues, including min/max hue values for each cluster

#### 5. Hue and Saturation Application
**Implemented in**: `imageProcessingWorker.js` (applyHueAndSaturation function)
- **Input**: Luminance-adjusted HSL image, Luminance-mapped image, hue palette
- **Process**:
  - For each pixel in the Luminance-adjusted HSL image:
    - Find the cluster where the pixel's hue falls within the cluster's min-max hue range
    - Apply the hue and saturation of the mapped color while preserving the luminance value
    - if no such cluster exists, use the corresponding pixel from the Luminance-mapped image 
- **Output**: Final HSL image with applied hue and saturation

#### 6. Output Generation
**Implemented in**: `imageProcessingWorker.js` (hslArrayToImageData) and `useImageProcessing.js` (getProcessedImageUrl, downloadProcessedImage)
- **Input**: Blended HSL image
- **Process**:
  - Convert HSL values back to RGB
  - Reconstruct image from pixel array
- **Output**: Processed image (displayed and available for download as PNG)

## Implementation Notes

1. **Performance Considerations**:
   - Use HTML5 Canvas API for efficient image processing
   - Implement progress tracking for each processing step
   - Use Web Workers for CPU-intensive image processing to prevent UI freezing

2. **Error Handling**:
   - Validate image dimensions and file size before processing
   - Provide user feedback for processing errors
   - Handle browser compatibility issues

3. **Default Values**:
   - Grayscale threshold: 0.1
   - Hue distance threshold: 15 (in degrees)
   - SL distance threshold: 0.2
   - Outlier percentage: 5%
   - Default color count: 8
