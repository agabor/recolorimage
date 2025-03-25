# Recolor Images WordPress Plugin

## Project Overview
A WordPress plugin that provides a powerful image recoloring tool using Vue.js. The plugin transforms images by mapping their colors to a custom palette using a dual-processing approach: luminance mapping and color adjustment.

## Installation and Usage

### Installation
1. Build the plugin:
```bash
cd recolorimages
npm install
npm run build:plugin
```

2. The build process will create a `plugin-build/recolorimage.zip` file.

3. Install the plugin in WordPress:
   - Go to Plugins > Add New > Upload Plugin
   - Select the `recolorimage.zip` file
   - Click "Install Now"
   - After installation completes, click "Activate"

### Usage
Use the shortcode `[recolorimage]` in any post or page where you want to display the Recolor Images application.

Example:
```
[recolorimage]
```

The plugin will automatically load all necessary JavaScript and CSS files only on pages where the shortcode is used.

## Technology Stack
- **Frontend Framework**: Vue.js 3 with Composition API
- **Image Processing**:
  - HTML5 Canvas API for pixel-level image manipulation
  - Chroma.js for color space conversions and manipulations
- **Build Tool**: Vite
- **WordPress Integration**: Shortcode-based integration with conditional asset loading

## Application Structure
The Vue.js application is implemented as modular components and composables for maximum reusability.

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
  - Displayed as individual color swatches ordered by luminance (dark to light)
  - Minimum of 2 colors
  - Each color swatch represents a distinct luminance level in the palette
  
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

### 5. UI Features
- Responsive design for desktop and mobile
- Simple processing indicator

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

#### 3. Color Mapping and Processing
**Implemented in**: `imageProcessingWorker.js` (mapLuminanceAndProcessColors function)
- **Input**: Luminance-adjusted HSL image, luminance palette, hue palette, grayscaleThreshold, hueThreshold
- **Process**:
  - Initialize counters for palette color usage statistics
  - For each pixel:
    1. Check if pixel is grayscale
    2. Process based on grayscale status:
       - If grayscale:
         - Find corresponding luminance palette color
         - Apply it directly
       - If not grayscale:
         - Find closest hue in the palette
         - If hue is within threshold:
           - Apply hue and saturation from palette color
           - Preserve adjusted luminance
           - Update color usage statistics
         - Otherwise: find and use corresponding luminance palette color
    3. Track color usage for statistics
  - Sort and filter counters to identify most-used palette colors
- **Output**: 
  - Final HSL image with applied colors
  - Statistics about palette color usage

#### 4. Output Generation
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
   - Use Web Workers for CPU-intensive image processing (mapLuminanceAndProcessColors) to prevent UI freezing

2. **Error Handling**:
   - Validate image dimensions and file size before processing
   - Provide user feedback for processing errors
   - Handle browser compatibility issues

3. **Default Values**:
   - Grayscale threshold: 0.3
   - Hue distance threshold: 60 (in degrees)
   - Outlier percentage: 5%
   - Default color count: 8

## Development

To work on the Vue.js application in development mode:

1. Run the development server:
```bash
npm run dev
```

2. Make your changes to the Vue.js application
3. Build for production when ready:
```bash
npm run build
```

4. Build the WordPress plugin:
```bash
npm run build:plugin
```
