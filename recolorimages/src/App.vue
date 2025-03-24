<script setup>
import { ref, watch } from 'vue';
import ImageUploader from './components/ImageUploader.vue';
import OutputDisplay from './components/OutputDisplay.vue';
import { useImageProcessing } from './composables/useImageProcessing';
import { DEFAULT_PALETTES } from './utils/colorUtils';

// Initialize the image processing composable
const {
  isProcessing,
  error,
  hasImage,
  hasProcessedImage,
  imageInfo,
  settings,
  selectedPalette,
  matchedPaletteStats,
  loadImage,
  processImage,
  getProcessedImageUrl,
  downloadProcessedImage,
  setPalette,
  toggleHueColor
} = useImageProcessing();

// Image URL for display
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

// Get match percentage for a color
const getMatchPercentage = (index) => {
  const stat = matchedPaletteStats.value.find(stat => stat.index === index);
  return stat ? stat.percentage : 0;
};

// Handle download
const handleDownload = () => {
  downloadProcessedImage('recolored-image.png');
};

// Update image URL
const updateImageUrls = () => {
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
        <!-- Image Upload -->
        <section class="section">
          <ImageUploader 
            :is-processing="isProcessing" 
            @file-selected="handleFileSelected"
          />
        </section>
        
        <!-- Palette Section -->
        <section class="section">
          <div class="palette-selector">
            <label for="palette-select">Select Palette:</label>
            <select id="palette-select" v-model="selectedPalette.name" @change="handlePaletteUpdate($event.target.value)">
              <option v-for="palette in Object.keys(DEFAULT_PALETTES)" :key="palette" :value="palette">
                {{ palette.charAt(0).toUpperCase() + palette.slice(1) }}
              </option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </section>

        <!-- Luminance Palette -->
        <section class="section">
          <h3>Luminance Palette</h3>
          <div class="luminance-swatches">
            <div 
              v-for="(color, index) in selectedPalette.luminance" 
              :key="index"
              class="color-swatch luminance-swatch"
              :style="{ backgroundColor: color.hex() }"
            ></div>
          </div>
        </section>

        <!-- Hue Palette -->
        <section class="section">
          <h3>Hue Palette <small>(click to enable/disable)</small></h3>
          <div class="hue-swatches">
            <div 
              v-for="(color, index) in selectedPalette.hue" 
              :key="index"
              class="color-swatch"
              :class="{ 
                'disabled': selectedPalette.disabledHues?.includes(index),
                'matched': getMatchPercentage(index) > 0
              }"
              :style="{ backgroundColor: color.hex() }"
              :data-percentage="getMatchPercentage(index)"
              @click="toggleHueColor(index)"
            ></div>
          </div>
        </section>

        <!-- Processing Controls -->
        <section class="section">
          <div class="setting-group">
            <label>Hue Threshold (degrees)</label>
            <input 
              type="range" 
              v-model="settings.hueThreshold" 
              min="1" 
              max="180" 
              :disabled="isProcessing"
            >
            <span class="value-display">{{ settings.hueThreshold }}°</span>
          </div>

          <div class="setting-group">
            <label>Grayscale Threshold</label>
            <input 
              type="range" 
              v-model="settings.grayscaleThreshold" 
              min="1" 
              max="100" 
              :disabled="isProcessing"
            >
            <span class="value-display">{{ settings.grayscaleThreshold }}</span>
          </div>

          <button 
            class="process-btn" 
            @click="handleProcess"
            :disabled="isProcessing || !hasImage"
          >
            <span v-if="isProcessing">Processing...</span>
            <span v-else>Recolor Image</span>
          </button>
        </section>

        <!-- Output -->
        <section class="section">
          <OutputDisplay 
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
  max-width: 800px;
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
  gap: 1.5rem;
}

.section {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
}

.section h3 {
  font-size: 1.1rem;
  margin-bottom: 1rem;
  color: var(--primary-color);
}

.palette-selector {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.palette-selector select {
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid #ccc;
  font-size: 1rem;
}

.luminance-swatches,
.hue-swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.color-swatch {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.color-swatch.disabled {
  opacity: 0.5;
}

.color-swatch.matched {
  transform: scale(1.1);
  z-index: 1;
}

.color-swatch.matched::before {
  content: attr(data-percentage) '%';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 0.8rem;
  font-weight: bold;
  text-shadow: 0 0 3px rgba(0, 0, 0, 0.7);
  background: rgba(0, 0, 0, 0.5);
  padding: 2px 4px;
  border-radius: 3px;
  white-space: nowrap;
}

.setting-group {
  margin-bottom: 1.5rem;
}

.setting-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: bold;
}

.setting-group input[type="range"] {
  width: 100%;
  margin-bottom: 0.5rem;
}

.value-display {
  color: #666;
  font-size: 0.9rem;
}

.process-btn {
  width: 100%;
  padding: 0.75rem;
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
}

.process-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

footer {
  text-align: center;
  margin-top: 3rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
  color: #666;
  font-size: 0.9rem;
}
</style>
