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

// Color manipulation functions
const updateLuminanceColor = (index, newColor) => {
  selectedPalette.luminance[index] = chroma(newColor);
};

const updateHueColor = (index, newColor) => {
  selectedPalette.hue[index] = chroma(newColor);
};

const deleteLuminanceColor = (index) => {
  if (selectedPalette.luminance.length > 2) {
    selectedPalette.luminance.splice(index, 1);
  }
};

const deleteHueColor = (index) => {
  if (selectedPalette.hue.length > 1) {
    selectedPalette.hue.splice(index, 1);
    // Remove the index from disabledHues and adjust remaining indices
    selectedPalette.disabledHues = selectedPalette.disabledHues
      .filter(i => i !== index)
      .map(i => i > index ? i - 1 : i);
  }
};

// Edit mode state
const isEditMode = ref(false);

// Reset palette
const resetPalette = () => {
  setPalette(selectedPalette.name);
  isEditMode.value = false;
};

// Toggle edit mode
const toggleEditMode = () => {
  isEditMode.value = !isEditMode.value;
};

// Get match percentage for a color
const getMatchPercentage = (index) => {
  const stat = matchedPaletteStats.value.find(stat => stat.index === index);
  return stat ? stat.percentage : null;
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
            </select>
          </div>
        </section>

        <!-- Luminance Palette -->
        <section class="section">
          <div class="section-header">
            <h3>Luminance Palette</h3>
            <div class="palette-actions">
              <button 
                class="edit-mode-btn" 
                :class="{ active: isEditMode }" 
                @click="toggleEditMode"
                title="Toggle edit mode"
              >
                <i class="fa-duotone fa-light fa-pencil"></i> Edit Colors
              </button>
              <button 
                v-if="isEditMode"
                class="reset-btn" 
                @click="resetPalette"
                title="Reset to original colors"
              >
                Reset
              </button>
            </div>
          </div>
          <div class="luminance-swatches">
            <div 
              v-for="(color, index) in selectedPalette.luminance" 
              :key="index"
              class="color-swatch luminance-swatch"
            >
              <div class="color-display" :style="{ backgroundColor: color.hex() }"></div>
              <template v-if="isEditMode">
                <button 
                  class="edit-color-btn" 
                  title="Edit color"
                >
                  <input 
                    type="color" 
                    :value="color.hex()"
                    @input="updateLuminanceColor(index, $event.target.value)"
                    class="color-picker"
                  />
                  <span><i class="fa-duotone fa-light fa-pencil"></i></span>
                </button>
                <button 
                  v-if="selectedPalette.luminance.length > 2"
                  class="delete-color-btn" 
                  title="Delete color"
                  @click="deleteLuminanceColor(index)"
                >
                  <i class="fa-duotone fa-light fa-xmark"></i>
                </button>
              </template>
            </div>
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
                'matched': getMatchPercentage(index) !== null
              }"
              :data-percentage="getMatchPercentage(index)"
              @click="!isEditMode && toggleHueColor(index)"
            >
              <div class="color-display" :style="{ backgroundColor: color.hex() }"></div>
              <template v-if="isEditMode">
                <button 
                  class="edit-color-btn" 
                  title="Edit color"
                >
                  <input 
                    type="color" 
                    :value="color.hex()"
                    @input="updateHueColor(index, $event.target.value)"
                    class="color-picker"
                  />
                  <span><i class="fa-duotone fa-light fa-pencil"></i></span>
                </button>
                <button 
                  v-if="selectedPalette.hue.length > 1"
                  class="delete-color-btn" 
                  title="Delete color"
                  @click="deleteHueColor(index)"
                >
                  <i class="fa-duotone fa-light fa-xmark"></i>
                </button>
              </template>
            </div>
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
              :disabled="isProcessing || settings.luminancePaletteOnly"
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
              :disabled="isProcessing || settings.luminancePaletteOnly"
            >
            <span class="value-display">{{ settings.grayscaleThreshold }}</span>
          </div>

          <div class="setting-group checkbox-group">
            <label>
              <input 
                type="checkbox" 
                v-model="settings.luminancePaletteOnly" 
                :disabled="isProcessing"
              >
              Use Luminance Palette Only
            </label>
            <div class="setting-description">
              When enabled, all colors will be mapped to the luminance palette without using the hue palette.
            </div>
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
.color-swatch.disabled::after {
   content: '';
   position: absolute;
   top: 0;
   left: 0;
   right: 0;
   bottom: 0;
   background: repeating-linear-gradient(
     45deg,
     rgba(0, 0, 0, 0.1),
     rgba(0, 0, 0, 0.1) 5px,
     rgba(0, 0, 0, 0.2) 5px,
     rgba(0, 0, 0, 0.2) 10px
   );
   border-radius: 4px;
 }
.color-swatch.matched {
  transform: scale(1.25);
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
  background-color: rgba(255, 255, 255, 0.6);
  color: black;
  font-size: smaller;
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

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  cursor: pointer;
}

.setting-description {
  font-size: 0.85rem;
  color: #666;
  margin-top: 0.25rem;
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

.color-swatch {
  position: relative;
}

.color-display {
  width: 100%;
  height: 100%;
  border-radius: 4px;
}

.edit-color-btn {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: white;
  border: 1px solid #ccc;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  font-size: 12px;
  color: #666;
  z-index: 2;
}

.edit-color-btn:hover {
  background: #f0f0f0;
}

.color-picker {
  position: absolute;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.palette-actions {
  display: flex;
  gap: 0.5rem;
}

.edit-mode-btn {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  border: 1px solid #ccc;
  background-color: #fff;
  cursor: pointer;
  transition: all 0.2s ease;
}

.edit-mode-btn.active {
  background-color: #e6e6e6;
  border-color: #999;
}

.edit-mode-btn:hover {
  background-color: #f0f0f0;
}

.reset-btn {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  border: 1px solid #ccc;
  background-color: #fff;
  cursor: pointer;
  transition: all 0.2s ease;
}

.reset-btn:hover {
  background-color: #f0f0f0;
}

.delete-color-btn {
  position: absolute;
  top: -8px;
  left: -8px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: white;
  border: 1px solid #ccc;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  font-size: 14px;
  color: #ff4444;
  z-index: 2;
}

.delete-color-btn:hover {
  background: #fff0f0;
  border-color: #ff4444;
}

</style>
