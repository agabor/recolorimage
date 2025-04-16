/**
 * Image processing composable for recoloring images
 * Uses a Web Worker for heavy processing to prevent UI freezing
 */
import { ref, computed, reactive, onUnmounted } from 'vue';
import chroma from 'chroma-js';
import * as colorUtils from '../utils/colorUtils';

// Create a new worker
const createWorker = () => {
  // Check if we're in WordPress (production) environment
  if (typeof window !== 'undefined' && window.recolorImagesPlugin) {
    // Use the production URL
    const workerUrl = `${window.recolorImagesPlugin.baseUrl}/assets/imageProcessingWorker.js`;
    return new Worker(workerUrl); // Classic worker (no module type)
  } else {
    // Use the local URL for development
    const workerUrl = new URL('../workers/imageProcessingWorker.js', import.meta.url);
    return new Worker(workerUrl); // Classic worker (no module type)
  }
};

export function useImageProcessing() {
  // State
  const originalImage = ref(null);
  const processedImage = ref(null);
  const isProcessing = ref(false);
  const error = ref(null);
  const matchedPaletteStats = ref([]);
  
  // Default settings values
  const DEFAULT_SETTINGS = {
    grayscaleThreshold: 30,
    hueThreshold: 60,
    outlierPercentage: 5,
    luminancePaletteOnly: false
  };
  
  // Settings
  const settings = reactive({...DEFAULT_SETTINGS});
  
// Selected palettes
const selectedPalette = reactive({
  name: 'nord',
  luminance: colorUtils.DEFAULT_PALETTES.nord.luminance.map(hex => chroma(hex)),
  hue: colorUtils.DEFAULT_PALETTES.nord.hue.map(hex => chroma(hex)),
  disabledHues: [],
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
   * Load an image from a file
   * @param {File} file - Image file
   * @returns {Promise} - Promise that resolves when the image is loaded
   */
  const loadImage = async (file) => {
    try {
      error.value = null;
      isProcessing.value = true;
      
      // Reset disabled hues and matched palette stats when loading a new image
      selectedPalette.disabledHues = [];
      matchedPaletteStats.value = [];
      
      const img = await createImageFromFile(file);
      const canvas = createCanvasFromImage(img);
      
      originalImage.value = {
        element: img,
        canvas,
        width: img.width,
        height: img.height
      };
      
      isProcessing.value = false;
      return originalImage.value;
    } catch (err) {
      error.value = `Failed to load image: ${err.message}`;
      isProcessing.value = false;
      throw err;
    }
  };
  
  // Note: All image processing functions have been moved to the Web Worker
  // to prevent UI freezing during heavy computations
  
  // Worker instance
  let worker = null;
  
  // Create a worker instance when needed
  const getWorker = () => {
    if (!worker) {
      worker = createWorker();
    }
    return worker;
  };
  
  // Clean up worker on component unmount
  onUnmounted(() => {
    if (worker) {
      worker.terminate();
      worker = null;
    }
  });
  
  /**
   * Create a canvas from ImageData
   * @param {Object} imageData - Object with data (Array), width, and height
   * @returns {HTMLCanvasElement} - Canvas element
   */
  const createCanvasFromImageData = (imageData) => {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    
    const ctx = canvas.getContext('2d');
    
    // Convert the regular Array back to a Uint8ClampedArray
    const typedData = new Uint8ClampedArray(imageData.data);
    
    const imgData = new ImageData(
      typedData, 
      imageData.width, 
      imageData.height
    );
    
    ctx.putImageData(imgData, 0, 0);
    return canvas;
  };
  
  /**
   * Process the image with the current settings using a Web Worker
   * @returns {Promise} - Promise that resolves when processing is complete
   */
  const processImage = () => {
    if (!originalImage.value) {
      error.value = 'No image loaded';
      return Promise.reject(new Error('No image loaded'));
    }

    error.value = null;
    isProcessing.value = true;

    const { canvas, width, height } = originalImage.value;
    const pixelData = getPixelData(canvas);

    return new Promise((resolve, reject) => {
      const workerInstance = getWorker();

      // Set up message handler
      workerInstance.onmessage = (e) => {
        const { error: workerError, ...imageData } = e.data;

        if (workerError) {
          error.value = `Worker error: ${workerError}`;
          isProcessing.value = false;
          reject(new Error(workerError));
          return;
        }

        // Handle final result
        if (imageData.processedImageData) {
          processedImage.value = {
            canvas: createCanvasFromImageData(imageData.processedImageData),
            width,
            height
          };

          // Store the matched palette stats, mapping from worker indices to original indices
          if (imageData.matchedPaletteStats && imageData.matchedPaletteStats.length > 0) {
            // Map worker indices to original palette indices
            matchedPaletteStats.value = imageData.matchedPaletteStats.map(stat => ({
              index: workerToOriginalIndices[stat.index],
              percentage: stat.percentage
            }));
          } else {
            matchedPaletteStats.value = [];
          }

          isProcessing.value = false;
          resolve(processedImage.value);
        }
      };

      // Handle worker errors
      workerInstance.onerror = (err) => {
        error.value = `Worker error: ${err.message}`;
        isProcessing.value = false;
        reject(err);
      };

      // Send data to worker
      // Note: We need to ensure all data is cloneable
      // Convert ImageData to a plain array to avoid cloning issues
      const pixelDataArray = Array.from(pixelData.data);

      // Convert chroma.Color objects to hex strings for cloning
      const luminancePaletteClone = selectedPalette.luminance.map(color => color.hex());

      // Filter out disabled hue colors and keep track of original indices
      const enabledHuesWithIndices = selectedPalette.hue
        .map((color, index) => ({ color, originalIndex: index }))
        .filter(item => !selectedPalette.disabledHues.includes(item.originalIndex));

      // Create a map from worker indices to original palette indices
      const workerToOriginalIndices = enabledHuesWithIndices.map(item => item.originalIndex);

      const huePaletteClone = enabledHuesWithIndices.map(item => item.color.hex());

      // Create a plain object with the settings
      const settingsClone = {
        grayscaleThreshold: settings.grayscaleThreshold,
        hueThreshold: settings.hueThreshold,
        outlierPercentage: settings.outlierPercentage,
        luminancePaletteOnly: settings.luminancePaletteOnly
      };

      workerInstance.postMessage({
        type: 'processImage',
        pixelData: pixelDataArray,
        width,
        height,
        luminancePalette: luminancePaletteClone,
        huePalette: huePaletteClone,
        settings: settingsClone
      });
    });
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
    selectedPalette.luminance = colorUtils.DEFAULT_PALETTES[paletteName].luminance.map(hex => chroma(hex));
    selectedPalette.hue = colorUtils.DEFAULT_PALETTES[paletteName].hue.map(hex => chroma(hex));
    selectedPalette.disabledHues = [];
    selectedPalette.custom = false;
    // Clear matched percentages when palette changes
    matchedPaletteStats.value = [];
  }
};
  
/**
 * Set a custom palette
 * @param {Array} luminancePalette - Custom luminance palette (array of chroma.Color objects or hex strings)
 * @param {Array} huePalette - Custom hue palette (array of chroma.Color objects or hex strings)
 */
const setCustomPalette = (luminancePalette, huePalette) => {
  selectedPalette.name = 'custom';
  
  // Ensure all palette colors are chroma.Color objects
  selectedPalette.luminance = luminancePalette.map(color => 
    typeof color === 'string' ? chroma(color) : color
  );
  
  selectedPalette.hue = huePalette.map(color => 
    typeof color === 'string' ? chroma(color) : color
  );
  
  selectedPalette.disabledHues = [];
  selectedPalette.custom = true;
  // Clear matched percentages when palette changes
  matchedPaletteStats.value = [];
};

/**
 * Toggle a hue color's enabled/disabled state
 * @param {number} index - Index of the hue color to toggle
 */
const toggleHueColor = (index) => {
  const disabledIndex = selectedPalette.disabledHues.indexOf(index);
  
  // If all colors except one would be disabled, don't allow disabling the last one
  if (disabledIndex === -1 && selectedPalette.disabledHues.length >= selectedPalette.hue.length - 1) {
    return;
  }
  
  if (disabledIndex === -1) {
    // Add to disabled list
    selectedPalette.disabledHues.push(index);
  } else {
    // Remove from disabled list
    selectedPalette.disabledHues.splice(disabledIndex, 1);
  }
};

/**
 * Reset settings to default values
 */
const resetSettings = () => {
  // Reset each setting to its default value
  Object.keys(DEFAULT_SETTINGS).forEach(key => {
    settings[key] = DEFAULT_SETTINGS[key];
  });
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
    isProcessing,
    error,
    settings,
    selectedPalette,
    matchedPaletteStats,
    
    // Computed
    hasImage,
    hasProcessedImage,
    imageInfo,
    
    // Methods
    loadImage,
    processImage,
    getProcessedImageUrl,
    getOriginalImageUrl,
    downloadProcessedImage,
    setPalette,
    setCustomPalette,
    toggleHueColor,
    resetSettings,
    
    // Note: Internal processing functions are now in the worker
  };
}
