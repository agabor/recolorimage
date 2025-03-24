<script setup>
import { ref, watch } from 'vue';
import ImageUploader from './components/ImageUploader.vue';
import OutputDisplay from './components/OutputDisplay.vue';
import { useImageProcessing } from './composables/useImageProcessing';
import { DEFAULT_PALETTES } from './utils/colorUtils';
import chroma from 'chroma-js';

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
  setCustomPalette,
  toggleHueColor
} = useImageProcessing();

// Custom palette state
const isCustomizing = ref(false);
const customLuminancePalette = ref([]);
const customHuePalette = ref([]);

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
  if (paletteName === 'custom') {
    isCustomizing.value = true;
    customLuminancePalette.value = [...selectedPalette.value.luminance].map(color => color.hex());
    customHuePalette.value = [...selectedPalette.value.hue].map(color => color.hex());
  } else {
    setPalette(paletteName);
    isCustomizing.value = false;
  }
};

// Custom palette functions
const addLuminanceColor = () => {
  customLuminancePalette.value.push('#FFFFFF');
};

const addHueColor = () => {
  customHuePalette.value.push('#FF0000');
};

const removeLuminanceColor = (index) => {
  if (customLuminancePalette.value.length > 2) {
    customLuminancePalette.value.splice(index, 1);
  }
};

const removeHueColor = (index) => {
  if (customHuePalette.value.length > 1) {
    customHuePalette.value.splice(index, 1);
  }
};

const applyCustomPalette = () => {
  const luminanceColors = customLuminancePalette.value.map(hex => chroma(hex));
  const hueColors = customHuePalette.value.map(hex => chroma(hex));
  setCustomPalette(luminanceColors, hueColors);
  isCustomizing.value = false;
};

const cancelCustomization = () => {
  isCustomizing.value = false;
  setPalette(selectedPalette.value.name);
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

        <template v-if="!isCustomizing">
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
        </template>

        <template v-else>
          <!-- Custom Luminance Palette -->
          <section class="section">
            <div class="section-header">
              <h3>Custom Luminance Palette</h3>
              <button class="add-color-btn" @click="addLuminanceColor">+</button>
            </div>
            <div class="color-editor">
              <div 
                v-for="(color, index) in customLuminancePalette" 
                :key="index"
                class="color-input-group"
              >
                <input 
                  type="color" 
                  v-model="customLuminancePalette[index]" 
                  class="color-picker"
                />
                <input 
                  type="text" 
                  v-model="customLuminancePalette[index]" 
                  class="color-text"
                />
                <button 
                  class="remove-color-btn" 
                  @click="removeLuminanceColor(index)"
                  :disabled="customLuminancePalette.length <= 2"
                >
                  ×
                </button>
              </div>
            </div>
          </section>

          <!-- Custom Hue Palette -->
          <section class="section">
            <div class="section-header">
              <h3>Custom Hue Palette</h3>
              <button class="add-color-btn" @click="addHueColor">+</button>
            </div>
            <div class="color-editor">
              <div 
                v-for="(color, index) in customHuePalette" 
                :key="index"
                class="color-input-group"
              >
                <input 
                  type="color" 
                  v-model="customHuePalette[index]" 
                  class="color-picker"
                />
                <input 
                  type="text" 
                  v-model="customHuePalette[index]" 
                  class="color-text"
                />
                <button 
                  class="remove-color-btn" 
                  @click="removeHueColor(index)"
                  :disabled="customHuePalette.length <= 1"
                >
                  ×
                </button>
              </div>
            </div>
          </section>

          <!-- Custom Palette Actions -->
          <section class="section">
            <div class="custom-palette-actions">
              <button class="apply-btn" @click="applyCustomPalette">Apply Custom Palette</button>
              <button class="cancel-btn" @click="cancelCustomization">Cancel</button>
            </div>
          </section>
        </template>

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
  </div>
</template>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.app {
  width: 100%;
  padding: 1rem;
}

.app-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.section {
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
}

.section h3 {
  margin-bottom: 1rem;
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

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.add-color-btn {
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.color-editor {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.color-input-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.color-picker {
  width: 40px;
  height: 40px;
  padding: 0;
  border: none;
  cursor: pointer;
}

.color-text {
  flex: 1;
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid #ccc;
}

.remove-color-btn {
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove-color-btn:disabled {
  cursor: not-allowed;
}

.custom-palette-actions {
  display: flex;
  gap: 1rem;
}

.apply-btn, .cancel-btn {
  flex: 1;
  padding: 0.75rem;
  border-radius: 4px;
  border: none;
  cursor: pointer;
}

.color-swatch.matched::before {
  content: attr(data-percentage) '%';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
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
}

.setting-group input[type="range"] {
  width: 100%;
  margin-bottom: 0.5rem;
}

.process-btn {
  width: 100%;
  padding: 0.75rem;
  border-radius: 4px;
  border: none;
  cursor: pointer;
}

.process-btn:disabled {
  cursor: not-allowed;
}

</style>
