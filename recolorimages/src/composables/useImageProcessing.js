/**
 * Image processing composable for recoloring images
 */
import { ref, computed, reactive } from 'vue';
import Jimp from 'jimp';
import { kmeans } from 'ml-kmeans';
import chroma from 'chroma-js';
import * as colorUtils from '../utils/colorUtils';

export function useImageProcessing() {
  // State
  const originalImage = ref(null);
  const processedImage = ref(null);
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
   * Load an image from a file
   * @param {File} file - Image file
   * @returns {Promise} - Promise that resolves when the image is loaded
   */
  const loadImage = async (file) => {
    try {
      error.value = null;
      isProcessing.value = true;
      progress.value = 10;
      
      // Read the file as an ArrayBuffer
      const buffer = await file.arrayBuffer();
      
      // Load the image using Jimp
      const image = await Jimp.read(Buffer.from(buffer));
      originalImage.value = image;
      
      progress.value = 100;
      isProcessing.value = false;
      return image;
    } catch (err) {
      error.value = `Failed to load image: ${err.message}`;
      isProcessing.value = false;
      throw err;
    }
  };
  
  /**
   * Convert Jimp image to HSL pixel array
   * @param {Jimp} image - Jimp image
   * @returns {Array} - Array of HSL pixel values
   */
  const imageToHslArray = (image) => {
    const width = image.getWidth();
    const height = image.getHeight();
    const hslArray = [];
    
    // Iterate through each pixel
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Get pixel color (RGBA)
        const rgba = Jimp.intToRGBA(image.getPixelColor(x, y));
        const rgb = [rgba.r, rgba.g, rgba.b];
        
        // Convert to HSL
        const hsl = colorUtils.rgbToHsl(rgb);
        hslArray.push({
          x,
          y,
          hsl,
          alpha: rgba.a
        });
      }
    }
    
    return hslArray;
  };
  
  /**
   * Convert HSL pixel array back to Jimp image
   * @param {Array} hslArray - Array of HSL pixel values
   * @param {Jimp} templateImage - Template image for dimensions
   * @returns {Jimp} - Jimp image
   */
  const hslArrayToImage = (hslArray, templateImage) => {
    const width = templateImage.getWidth();
    const height = templateImage.getHeight();
    const image = new Jimp(width, height);
    
    // Iterate through each pixel
    hslArray.forEach(pixel => {
      const { x, y, hsl, alpha } = pixel;
      
      // Convert HSL back to RGB
      const rgb = colorUtils.hslToRgb(hsl);
      
      // Set pixel color
      const rgba = Jimp.rgbaToInt(
        Math.round(rgb[0]),
        Math.round(rgb[1]),
        Math.round(rgb[2]),
        alpha
      );
      image.setPixelColor(rgba, x, y);
    });
    
    return image;
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
      
      // Step 1: Image Preparation
      progress.value = 10;
      const hslArray = imageToHslArray(originalImage.value);
      
      // Step 2: Luminance Range Adjustment
      progress.value = 20;
      const luminanceAdjustedArray = adjustLuminanceRange(
        hslArray,
        selectedPalette.luminance
      );
      
      // Step 3: Luminance Mapping
      progress.value = 40;
      const luminanceMappedArray = mapLuminance(
        luminanceAdjustedArray,
        selectedPalette.luminance
      );
      
      // Create luminance-mapped image
      luminanceMappedImage.value = hslArrayToImage(
        luminanceMappedArray,
        originalImage.value
      );
      
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
      colorAdjustedImage.value = hslArrayToImage(
        colorAdjustedArray,
        originalImage.value
      );
      
      // Step 6: Blending
      progress.value = 80;
      const blendedArray = blendImages(
        luminanceMappedArray,
        colorAdjustedArray,
        selectedPalette.hue
      );
      
      // Step 7: Output Generation
      progress.value = 90;
      processedImage.value = hslArrayToImage(
        blendedArray,
        originalImage.value
      );
      
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
   * @returns {Promise<string>} - Promise that resolves to a data URL
   */
  const getProcessedImageUrl = async () => {
    if (!processedImage.value) {
      return null;
    }
    
    return await processedImage.value.getBase64Async(Jimp.MIME_PNG);
  };
  
  /**
   * Get the original image as a data URL
   * @returns {Promise<string>} - Promise that resolves to a data URL
   */
  const getOriginalImageUrl = async () => {
    if (!originalImage.value) {
      return null;
    }
    
    return await originalImage.value.getBase64Async(Jimp.MIME_PNG);
  };
  
  /**
   * Get the luminance-mapped image as a data URL
   * @returns {Promise<string>} - Promise that resolves to a data URL
   */
  const getLuminanceMappedImageUrl = async () => {
    if (!luminanceMappedImage.value) {
      return null;
    }
    
    return await luminanceMappedImage.value.getBase64Async(Jimp.MIME_PNG);
  };
  
  /**
   * Get the color-adjusted image as a data URL
   * @returns {Promise<string>} - Promise that resolves to a data URL
   */
  const getColorAdjustedImageUrl = async () => {
    if (!colorAdjustedImage.value) {
      return null;
    }
    
    return await colorAdjustedImage.value.getBase64Async(Jimp.MIME_PNG);
  };
  
  /**
   * Download the processed image
   * @param {string} filename - Filename for the downloaded image
   * @returns {Promise} - Promise that resolves when the download is initiated
   */
  const downloadProcessedImage = async (filename = 'recolored-image.png') => {
    if (!processedImage.value) {
      error.value = 'No processed image available';
      return;
    }
    
    try {
      const dataUrl = await getProcessedImageUrl();
      
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
      width: originalImage.value.getWidth(),
      height: originalImage.value.getHeight(),
      format: originalImage.value.getMIME()
    };
  });
  
  return {
    // State
    originalImage,
    processedImage,
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
    getLuminanceMappedImageUrl,
    getColorAdjustedImageUrl,
    downloadProcessedImage,
    setPalette,
    setCustomPalette
  };
}
