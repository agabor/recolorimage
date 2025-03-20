<script setup>
import { ref, onMounted, watch } from 'vue';
import ImageUploader from './components/ImageUploader.vue';
import ColorPalette from './components/ColorPalette.vue';
import ProcessingControls from './components/ProcessingControls.vue';
import OutputDisplay from './components/OutputDisplay.vue';
import { useImageProcessing } from './composables/useImageProcessing';

// Initialize the image processing composable
const {
  isProcessing,
  error,
  hasImage,
  hasProcessedImage,
  imageInfo,
  settings,
  selectedPalette,
  matchedPaletteIndices,
  loadImage,
  processImage,
  getOriginalImageUrl,
  getProcessedImageUrl,
  downloadProcessedImage,
  setPalette,
  setCustomPalette,
  toggleHueColor
} = useImageProcessing();

// Image URLs for display
const originalImageUrl = ref(null);
const processedImageUrl = ref(null);

// Handle file selection
const handleFileSelected = async (file) => {
  try {
    await loadImage(file);
    updateImageUrls();
  } catch (err) {
    console.error('Error loading image:', err);
  }
};

// Handle processing
const handleProcess = async () => {
  try {
    await processImage();
    updateImageUrls();
  } catch (err) {
    console.error('Error processing image:', err);
  }
};

// Handle palette update
const handlePaletteUpdate = (paletteName) => {
  setPalette(paletteName);
};

// Handle custom palette
const handleCustomPalette = (palette) => {
  setCustomPalette(palette.luminance, palette.hue);
};

// Handle download
const handleDownload = () => {
  downloadProcessedImage('recolored-image.png');
};

// Update image URLs
const updateImageUrls = () => {
  if (hasImage.value) {
    originalImageUrl.value = getOriginalImageUrl();
  }
  
  if (hasProcessedImage.value) {
    processedImageUrl.value = getProcessedImageUrl();
  }
};

// Watch for errors
watch(error, (newError) => {
  if (newError) {
    alert(`Error: ${newError}`);
  }
});
</script>

<template>
  <div class="app">
    <header>
      <h1>Recolor Images</h1>
      <p>Transform images by mapping their colors to a custom palette</p>
    </header>
    
    <main>
      <div class="app-container">
        <section class="section">
          <h2>1. Upload Image</h2>
          <ImageUploader 
            :is-processing="isProcessing" 
            @file-selected="handleFileSelected"
          />
        </section>
        
        <section class="section">
          <h2>2. Select Color Palette</h2>
          <ColorPalette 
            :selected-palette="selectedPalette"
            :matched-palette-indices="matchedPaletteIndices"
            @update:palette="handlePaletteUpdate"
            @custom-palette="handleCustomPalette"
            @toggle-hue="toggleHueColor"
          />
        </section>
        
        <section class="section">
          <h2>3. Processing Controls</h2>
          <ProcessingControls 
            :is-processing="isProcessing"
            :has-image="hasImage"
            :settings="settings"
            :selected-palette="selectedPalette"
            @process="handleProcess"
            @update:settings="newSettings => Object.assign(settings, newSettings)"
          />
        </section>
        
        <section class="section">
          <h2>4. Output</h2>
          <OutputDisplay 
            :original-image-url="originalImageUrl"
            :processed-image-url="processedImageUrl"
            :image-info="imageInfo"
            :has-processed-image="hasProcessedImage"
            @download="handleDownload"
          />
        </section>
      </div>
    </main>
    
    <footer>
      <p>Built with Vue.js, Canvas API, and Chroma.js</p>
    </footer>
  </div>
</template>

<style>
/* Global styles */
:root {
  --primary-color: #4CAF50;
  --text-color: #333;
  --background-color: #f8f8f8;
  --border-color: #ddd;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  line-height: 1.6;
  color: var(--text-color);
  background-color: var(--background-color);
}

/* App styles */
.app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

header {
  text-align: center;
  margin-bottom: 2rem;
}

header h1 {
  color: var(--primary-color);
  margin-bottom: 0.5rem;
}

header p {
  color: #666;
}

.app-container {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.section {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
}

.section h2 {
  font-size: 1.25rem;
  margin-bottom: 1rem;
  color: var(--primary-color);
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 0.5rem;
}

footer {
  text-align: center;
  margin-top: 3rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
  color: #666;
  font-size: 0.9rem;
}

/* Responsive styles */
@media (min-width: 768px) {
  .app-container {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
  }
  
  .section:nth-child(3),
  .section:nth-child(4) {
    grid-column: span 2;
  }
}

@media (min-width: 1024px) {
  .app-container {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
