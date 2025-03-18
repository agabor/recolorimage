/**
 * Image processing composable for recoloring images
 */
import { ref, computed, reactive } from 'vue';
import { kmeans } from 'ml-kmeans';
import chroma from 'chroma-js';
import * as colorUtils from '../utils/colorUtils';

export function useImageProcessing() {
  // State
  const originalImage = ref(null);
  const processedImage = ref(null);
  const luminanceAdjustedImage = ref(null);
  const luminanceMappedImage = ref(null);
  const colorAdjustedImage = ref(null);
  const isProcessing = ref(false);
  const progress = ref(0);
  const error = ref(null);
  
  // Settings
  const settings = reactive({
    colorCount: 8,
    grayscaleThreshold: 0.1,
    hueDistanceThreshold: 15,
    slDistanceThreshold: 0.2,
    outlierPercentage: 5
  });
  
  // Selected palettes
  const selectedPalette = reactive({
    name: 'nord',
    luminance: colorUtils.DEFAULT_PALETTES.nord.luminance,
    hue: colorUtils.DEFAULT_PALETTES.nord.hue,
    custom: false
  });
  
  /**
   * Create an image element from a file
   * @param {File} file - Image file
   * @returns {Promise<HTMLImageElement>} - Promise that resolves to an image element
   */
  const createImageFromFile = (file) => {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      
      img.onload = () => {
        resolve(img);
        URL.revokeObjectURL(url);
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
        URL.revokeObjectURL(url);
      };
      
      img.src = url;
    });
  };
  
  /**
   * Create a canvas from an image
   * @param {HTMLImageElement} img - Image element
   * @returns {HTMLCanvasElement} - Canvas element
   */
  const createCanvasFromImage = (img) => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    
    return canvas;
  };
  
  /**
   * Get pixel data from a canvas
   * @param {HTMLCanvasElement} canvas - Canvas element
   * @returns {ImageData} - Pixel data
   */
  const getPixelData = (canvas) => {
    const ctx = canvas.getContext('2d');
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  };
  
  /**
   * Convert pixel data to HSL array
   * @param {ImageData} pixelData - Pixel data
   * @returns {Array} - Array of HSL pixel values
   */
  const pixelDataToHslArray = (pixelData) => {
    const { data, width, height } = pixelData;
    const hslArray = [];
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      
      const x = (i / 4) % width;
      const y = Math.floor((i / 4) / width);
      
      const hsl = colorUtils.rgbToHsl([r, g, b]);
      
      hslArray.push({
        x,
        y,
        hsl,
        alpha: a
      });
    }
    
    return hslArray;
  };
  
  /**
   * Convert HSL array to canvas
   * @param {Array} hslArray - Array of HSL pixel values
   * @param {Number} width - Canvas width
   * @param {Number} height - Canvas height
   * @returns {HTMLCanvasElement} - Canvas element
   */
  const hslArrayToCanvas = (hslArray, width, height) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(width, height);
    
    hslArray.forEach(pixel => {
      const { x, y, hsl, alpha } = pixel;
      const index = (y * width + x) * 4;
      
      const rgb = colorUtils.hslToRgb(hsl);
      
      imageData.data[index] = Math.round(rgb[0]);
      imageData.data[index + 1] = Math.round(rgb[1]);
      imageData.data[index + 2] = Math.round(rgb[2]);
      imageData.data[index + 3] = alpha;
    });
    
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  };
  
  /**
   * Load an image from a file
   * @param {File} file - Image file
   * @returns {Promise} - Promise that resolves when the image is loaded
   */
  const loadImage = async (file) => {
    try {
      error.value = null;
      isProcessing.value = true;
      progress.value = 10;
      
      const img = await createImageFromFile(file);
      const canvas = createCanvasFromImage(img);
      
      originalImage.value = {
        element: img,
        canvas,
        width: img.width,
        height: img.height
      };
      
      progress.value = 100;
      isProcessing.value = false;
      return originalImage.value;
    } catch (err) {
      error.value = `Failed to load image: ${err.message}`;
      isProcessing.value = false;
      throw err;
    }
  };
  
  /**
   * Adjust the luminance range of an HSL image
   * @param {Array} hslArray - Array of HSL pixel values
   * @param {Array} luminancePalette - Array of luminance palette colors
   * @returns {Array} - Adjusted HSL pixel array
   */
  const adjustLuminanceRange = (hslArray, luminancePalette) => {
    // Calculate luminance range of input image
    const inputRange = colorUtils.calculateLuminanceRange(
      hslArray.map(pixel => pixel.hsl),
      settings.outlierPercentage
    );
    
    // Calculate luminance range of palette
    const paletteLightness = luminancePalette.map(color => {
      try {
        return chroma(color).get('hsl.l');
      } catch (err) {
        console.error('Error converting color:', color, err);
        return 0;
      }
    });
    const paletteRange = {
      min: Math.min(...paletteLightness),
      max: Math.max(...paletteLightness)
    };
    
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
        // Shift (no scaling up)
        // Center the input range within the palette range
        const shift = (paletteRange.min + paletteRange.max - inputRange.min - inputRange.max) / 2;
        adjustedL = l + shift;
        
        // Clamp to palette range
        adjustedL = Math.max(paletteRange.min, Math.min(paletteRange.max, adjustedL));
      }
      
      return {
        ...pixel,
        hsl: [h, s, adjustedL]
      };
    });
  };
  
  /**
   * Map pixels to luminance palette
   * @param {Array} hslArray - Array of HSL pixel values
   * @param {Array} luminancePalette - Array of luminance palette colors
   * @returns {Array} - Mapped HSL pixel array
   */
  const mapLuminance = (hslArray, luminancePalette) => {
    return hslArray.map(pixel => {
      const [h, s, l] = pixel.hsl;
      
      // Find corresponding color on luminance palette
      const mappedRgb = colorUtils.findClosestLuminanceColor(l, luminancePalette);
      const mappedHsl = colorUtils.rgbToHsl(mappedRgb);
      
      return {
        ...pixel,
        hsl: mappedHsl
      };
    });
  };
  
  /**
   * Cluster hues and create mappings
   * @param {Array} hslArray - Array of HSL pixel values
   * @param {Array} huePalette - Array of hue palette colors
   * @param {Number} colorCount - Number of color clusters
   * @returns {Object} - Mappings for hue, saturation, and lightness
   */
  const clusterHues = (hslArray, huePalette, colorCount) => {
    // Filter pixels that are mappable to hue palette
    const mappablePixels = hslArray.filter(pixel => 
      colorUtils.isHueMappable(pixel.hsl, huePalette)
    );
    
    // If no mappable pixels, return empty mappings
    if (mappablePixels.length === 0) {
      return {
        hueMapping: new Map(),
        saturationMapping: new Map(),
        lightnessMapping: new Map()
      };
    }
    
    // Extract hue values for clustering
    const hueValues = mappablePixels.map(pixel => [pixel.hsl[0]]);
    
    // Run K-means clustering on hue values
    const clusterCount = Math.min(colorCount, mappablePixels.length);
    const { clusters, centroids } = kmeans(hueValues, clusterCount);
    
    // Create mappings
    const hueMapping = new Map();
    const saturationMapping = new Map();
    const lightnessMapping = new Map();
    
    // Process each cluster
    for (let i = 0; i < centroids.length; i++) {
      const clusterHue = centroids[i][0];
      
      // Find pixels in this cluster
      const clusterPixels = mappablePixels.filter((_, index) => 
        clusters[index] === i
      );
      
      // Map cluster center hue to closest hue in palette
      const { color: mappedColor, index: mappedIndex } = 
        colorUtils.findClosestHueColor(clusterHue, huePalette);
      
      // Calculate average saturation and lightness of cluster
      const avgSaturation = clusterPixels.reduce((sum, pixel) => 
        sum + pixel.hsl[1], 0) / clusterPixels.length;
      
      const avgLightness = clusterPixels.reduce((sum, pixel) => 
        sum + pixel.hsl[2], 0) / clusterPixels.length;
      
      // Get mapped color's saturation and lightness
      const mappedHsl = colorUtils.rgbToHsl(colorUtils.hslToRgb(mappedColor));
      const mappedSaturation = mappedHsl[1];
      const mappedLightness = mappedHsl[2];
      
      // Calculate scale factors
      const saturationScale = mappedSaturation > 0 ? avgSaturation / mappedSaturation : 1;
      const lightnessScale = mappedLightness > 0 ? avgLightness / mappedLightness : 1;
      
      // Store mappings
      hueMapping.set(clusterHue, mappedColor);
      saturationMapping.set(clusterHue, saturationScale);
      lightnessMapping.set(clusterHue, lightnessScale);
    }
    
    return {
      hueMapping,
      saturationMapping,
      lightnessMapping
    };
  };
  
  /**
   * Adjust colors based on hue clustering
   * @param {Array} hslArray - Array of HSL pixel values
   * @param {Object} mappings - Mappings from clusterHues
   * @returns {Array} - Color-adjusted HSL pixel array
   */
  const adjustColors = (hslArray, mappings) => {
    const { hueMapping, saturationMapping, lightnessMapping } = mappings;
    
    // If no mappings, return original array
    if (hueMapping.size === 0) {
      return hslArray;
    }
    
    return hslArray.map(pixel => {
      const [h, s, l] = pixel.hsl;
      
      // Find two closest cluster centers
      const clusterHues = Array.from(hueMapping.keys());
      if (clusterHues.length === 0) {
        return pixel;
      }
      
      // Calculate distances to all cluster centers
      const distances = clusterHues.map(clusterHue => {
        let distance = Math.abs(h - clusterHue);
        if (distance > 180) {
          distance = 360 - distance;
        }
        return { clusterHue, distance };
      });
      
      // Sort by distance
      distances.sort((a, b) => a.distance - b.distance);
      
      // Get closest cluster
      const closestCluster = distances[0].clusterHue;
      
      // Get mapped values
      const mappedColor = hueMapping.get(closestCluster);
      const saturationScale = saturationMapping.get(closestCluster) || 1;
      const lightnessScale = lightnessMapping.get(closestCluster) || 1;
      
      // Get mapped hue
      const mappedHsl = colorUtils.rgbToHsl(colorUtils.hslToRgb(mappedColor));
      const mappedHue = mappedHsl[0];
      
      // Apply adjustments
      const adjustedHue = mappedHue;
      const adjustedSaturation = Math.min(1, s * saturationScale);
      const adjustedLightness = Math.min(1, l * lightnessScale);
      
      return {
        ...pixel,
        hsl: [adjustedHue, adjustedSaturation, adjustedLightness]
      };
    });
  };
  
  /**
   * Blend luminance-mapped and color-adjusted images
   * @param {Array} luminanceArray - Luminance-mapped HSL pixel array
   * @param {Array} colorArray - Color-adjusted HSL pixel array
   * @param {Array} huePalette - Array of hue palette colors
   * @returns {Array} - Blended HSL pixel array
   */
  const blendImages = (luminanceArray, colorArray, huePalette) => {
    return luminanceArray.map((lumPixel, index) => {
      const colorPixel = colorArray[index];
      
      // Calculate blend factor
      const factor = colorUtils.blendFactor(colorPixel.hsl, huePalette);
      
      // Linear interpolation between luminance and color pixels
      const blendedHsl = [
        colorPixel.hsl[0], // Use hue from color-adjusted pixel
        lumPixel.hsl[1] * (1 - factor) + colorPixel.hsl[1] * factor, // Blend saturation
        lumPixel.hsl[2] * (1 - factor) + colorPixel.hsl[2] * factor  // Blend lightness
      ];
      
      return {
        ...lumPixel,
        hsl: blendedHsl
      };
    });
  };
  
  /**
   * Process the image with the current settings
   * @returns {Promise} - Promise that resolves when processing is complete
   */
  const processImage = async () => {
    if (!originalImage.value) {
      error.value = 'No image loaded';
      return;
    }
    
    try {
      error.value = null;
      isProcessing.value = true;
      progress.value = 0;
      
      const { canvas, width, height } = originalImage.value;
      
      // Step 1: Image Preparation
      progress.value = 10;
      const pixelData = getPixelData(canvas);
      const hslArray = pixelDataToHslArray(pixelData);
      
      // Step 2: Luminance Range Adjustment
      progress.value = 20;
      const luminanceAdjustedArray = adjustLuminanceRange(
        hslArray,
        selectedPalette.luminance
      );
      
      // Create luminance-adjusted image
      luminanceAdjustedImage.value = {
        canvas: hslArrayToCanvas(luminanceAdjustedArray, width, height),
        width,
        height
      };
      
      // Step 3: Luminance Mapping
      progress.value = 40;
      const luminanceMappedArray = mapLuminance(
        luminanceAdjustedArray,
        selectedPalette.luminance
      );
      
      // Create luminance-mapped image
      luminanceMappedImage.value = {
        canvas: hslArrayToCanvas(luminanceMappedArray, width, height),
        width,
        height
      };
      
      // Step 4: Hue Clustering
      progress.value = 60;
      const mappings = clusterHues(
        luminanceAdjustedArray,
        selectedPalette.hue,
        settings.colorCount
      );
      
      // Step 5: Color Adjustment
      progress.value = 70;
      const colorAdjustedArray = adjustColors(
        luminanceAdjustedArray,
        mappings
      );
      
      // Create color-adjusted image
      colorAdjustedImage.value = {
        canvas: hslArrayToCanvas(colorAdjustedArray, width, height),
        width,
        height
      };
      
      // Step 6: Blending
      progress.value = 80;
      const blendedArray = blendImages(
        luminanceMappedArray,
        colorAdjustedArray,
        selectedPalette.hue
      );
      
      // Step 7: Output Generation
      progress.value = 90;
      processedImage.value = {
        canvas: hslArrayToCanvas(blendedArray, width, height),
        width,
        height
      };
      
      progress.value = 100;
      isProcessing.value = false;
      
      return processedImage.value;
    } catch (err) {
      error.value = `Processing failed: ${err.message}`;
      isProcessing.value = false;
      throw err;
    }
  };
  
  /**
   * Get the processed image as a data URL
   * @returns {string} - Data URL
   */
  const getProcessedImageUrl = () => {
    if (!processedImage.value) {
      return null;
    }
    
    return processedImage.value.canvas.toDataURL('image/png');
  };
  
  /**
   * Get the original image as a data URL
   * @returns {string} - Data URL
   */
  const getOriginalImageUrl = () => {
    if (!originalImage.value) {
      return null;
    }
    
    return originalImage.value.canvas.toDataURL('image/png');
  };
  
  /**
   * Get the luminance-mapped image as a data URL
   * @returns {string} - Data URL
   */
  const getLuminanceMappedImageUrl = () => {
    if (!luminanceMappedImage.value) {
      return null;
    }
    
    return luminanceMappedImage.value.canvas.toDataURL('image/png');
  };
  
  /**
   * Get the luminance-adjusted image as a data URL
   * @returns {string} - Data URL
   */
  const getLuminanceAdjustedImageUrl = () => {
    if (!luminanceAdjustedImage.value) {
      return null;
    }
    
    return luminanceAdjustedImage.value.canvas.toDataURL('image/png');
  };
  
  /**
   * Get the color-adjusted image as a data URL
   * @returns {string} - Data URL
   */
  const getColorAdjustedImageUrl = () => {
    if (!colorAdjustedImage.value) {
      return null;
    }
    
    return colorAdjustedImage.value.canvas.toDataURL('image/png');
  };
  
  /**
   * Download the processed image
   * @param {string} filename - Filename for the downloaded image
   */
  const downloadProcessedImage = (filename = 'recolored-image.png') => {
    if (!processedImage.value) {
      error.value = 'No processed image available';
      return;
    }
    
    try {
      const dataUrl = getProcessedImageUrl();
      
      // Create a download link
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      error.value = `Download failed: ${err.message}`;
      throw err;
    }
  };
  
  /**
   * Set the active palette
   * @param {string} paletteName - Name of the palette to use
   */
  const setPalette = (paletteName) => {
    if (colorUtils.DEFAULT_PALETTES[paletteName]) {
      selectedPalette.name = paletteName;
      selectedPalette.luminance = colorUtils.DEFAULT_PALETTES[paletteName].luminance;
      selectedPalette.hue = colorUtils.DEFAULT_PALETTES[paletteName].hue;
      selectedPalette.custom = false;
    }
  };
  
  /**
   * Set a custom palette
   * @param {Array} luminancePalette - Custom luminance palette
   * @param {Array} huePalette - Custom hue palette
   */
  const setCustomPalette = (luminancePalette, huePalette) => {
    selectedPalette.name = 'custom';
    selectedPalette.luminance = luminancePalette;
    selectedPalette.hue = huePalette;
    selectedPalette.custom = true;
  };
  
  // Computed properties
  const hasImage = computed(() => !!originalImage.value);
  const hasProcessedImage = computed(() => !!processedImage.value);
  const imageInfo = computed(() => {
    if (!originalImage.value) {
      return null;
    }
    
    return {
      width: originalImage.value.width,
      height: originalImage.value.height,
      format: 'image/png'
    };
  });
  
  return {
    // State
    originalImage,
    processedImage,
    luminanceAdjustedImage,
    luminanceMappedImage,
    colorAdjustedImage,
    isProcessing,
    progress,
    error,
    settings,
    selectedPalette,
    
    // Computed
    hasImage,
    hasProcessedImage,
    imageInfo,
    
    // Methods
    loadImage,
    processImage,
    getProcessedImageUrl,
    getOriginalImageUrl,
    getLuminanceAdjustedImageUrl,
    getLuminanceMappedImageUrl,
    getColorAdjustedImageUrl,
    downloadProcessedImage,
    setPalette,
    setCustomPalette,
    
    // Expose internal functions for testing
    clusterHues,
    adjustLuminanceRange
  };
}
