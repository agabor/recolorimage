<script setup>
import { ref, onMounted, computed } from 'vue';
import { fetchWordPressColorPalettes } from '../utils/colorUtils';

import chroma from 'chroma-js';

const props = defineProps({
  show: Boolean,
  url: String
});

const emit = defineEmits(['close', 'select']);

const palettes = ref({});
const loading = ref(false);
const error = ref(null);
const urlInput = ref('');
const selectedPalettes = ref(new Set());
const selectedHueColors = ref(new Set());
const step = ref('luminance'); // 'luminance' or 'hue'
const luminancePalette = ref([]);

// All colors from WordPress site
const allColors = computed(() => {
  const colors = [];
  Object.values(palettes.value).forEach(palette => {
    colors.push(...palette);
  });
  return [...new Set(colors)]; // Remove duplicates
});

// Colors available for hue selection (all colors except those in luminance palette)
const availableHueColors = computed(() => {
  if (!luminancePalette.value.length) return [];
  
  return allColors.value.filter(color => 
    !luminancePalette.value.includes(color)
  );
});

const fetchPalettes = async () => {
  loading.value = true;
  error.value = null;
  try {
    palettes.value = await fetchWordPressColorPalettes(urlInput.value);
    if (Object.keys(palettes.value).length === 0) {
      error.value = 'No numbered color palettes found';
    }
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
};

const togglePaletteSelection = (name) => {
  if (selectedPalettes.value.has(name)) {
    selectedPalettes.value.delete(name);
  } else {
    selectedPalettes.value.add(name);
  }
};

const toggleHueColorSelection = (color) => {
  if (selectedHueColors.value.has(color)) {
    selectedHueColors.value.delete(color);
  } else {
    selectedHueColors.value.add(color);
  }
};

const handleLuminanceConfirm = () => {
  // Combine all selected palettes for luminance
  const allLuminanceColors = [];
  selectedPalettes.value.forEach(name => {
    allLuminanceColors.push(...palettes.value[name]);
  });

  // Sort colors by luminance (dark to light)
  const sortedColors = allLuminanceColors.sort((a, b) => {
    const lumA = chroma(a).luminance();
    const lumB = chroma(b).luminance();
    return lumA - lumB;
  });

  // Remove duplicates while preserving order
  luminancePalette.value = [...new Set(sortedColors)];
  
  // Clear hue selection
  selectedHueColors.value = new Set();
  
  // Move to hue selection step
  step.value = 'hue';
};

const handleHueConfirm = () => {
  // Convert Set to Array for hue colors
  const hueColors = Array.from(selectedHueColors.value);
  
  emit('select', { 
    name: 'combined', 
    colors: luminancePalette.value,
    hueColors: hueColors
  });
  
  // Reset state
  step.value = 'luminance';
  luminancePalette.value = [];
  selectedPalettes.value = new Set();
  selectedHueColors.value = new Set();
  
  emit('close');
};

const goBackToLuminance = () => {
  step.value = 'luminance';
  luminancePalette.value = [];
  selectedHueColors.value = new Set();
};

onMounted(() => {
  if (props.url) {
    urlInput.value = props.url;
    fetchPalettes();
  }
});
</script>

<template>
  <div v-if="show" class="modal-overlay">
    <div class="modal-content">
      <div class="modal-header">
        <h3>
          {{ step === 'luminance' ? 'Select Luminance Palette' : 'Select Hue Colors' }}
        </h3>
        <button class="close-btn" @click="$emit('close')">&times;</button>
      </div>

      <!-- Step indicator -->
      <div class="step-indicator">
        <div class="step" :class="{ 'active': step === 'luminance' }">1. Luminance Palette</div>
        <div class="step-divider"></div>
        <div class="step" :class="{ 'active': step === 'hue' }">2. Hue Colors</div>
      </div>

      <!-- URL input (only shown in luminance step) -->
      <div v-if="step === 'luminance'" class="url-input">
        <input 
          type="text" 
          v-model="urlInput" 
          placeholder="Enter WordPress site URL"
          :disabled="loading"
        >
        <button 
          @click="fetchPalettes" 
          :disabled="loading || !urlInput"
          class="fetch-btn"
        >
          {{ loading ? 'Loading...' : 'Fetch Palettes' }}
        </button>
      </div>

      <div v-if="error" class="error-message">
        {{ error }}
      </div>

      <!-- Luminance Step -->
      <div v-if="step === 'luminance' && Object.keys(palettes).length > 0" class="palettes-container">
        <div 
          v-for="(colors, name) in palettes" 
          :key="name"
          class="palette-option"
        >
          <h4>{{ name.replace(/-/g, ' ') }}</h4>
          <div class="color-preview">
            <div 
              v-for="(color, index) in colors" 
              :key="index"
              class="color-swatch"
              :style="{ backgroundColor: color }"
              :title="color"
            ></div>
          </div>
          <button 
            @click="togglePaletteSelection(name)"
            class="select-btn"
            :class="{ 'selected': selectedPalettes.has(name) }"
          >
            {{ selectedPalettes.has(name) ? 'Selected' : 'Select' }}
          </button>
        </div>
      </div>
      
      <!-- Hue Step -->
      <div v-if="step === 'hue'" class="hue-selection">
        <div class="section-header">
          <h4>Selected Luminance Palette</h4>
        </div>
        <div class="color-preview luminance-preview">
          <div 
            v-for="(color, index) in luminancePalette" 
            :key="`lum-${index}`"
            class="color-swatch"
            :style="{ backgroundColor: color }"
            :title="color"
          ></div>
        </div>

        <div class="section-header">
          <h4>Available Colors for Hue Palette</h4>
          <p class="selection-hint">Click colors to select/deselect for hue palette</p>
        </div>
        <div class="color-preview hue-colors-grid">
          <div 
            v-for="(color, index) in availableHueColors" 
            :key="`hue-${index}`"
            class="color-swatch hue-color-option"
            :class="{ 'selected': selectedHueColors.has(color) }"
            :style="{ backgroundColor: color }"
            :title="color"
            @click="toggleHueColorSelection(color)"
          ></div>
        </div>
      </div>
      
      <!-- Footer buttons -->
      <div class="modal-footer">
        <!-- Luminance step buttons -->
        <button 
          v-if="step === 'luminance' && Object.keys(palettes).length > 0"
          @click="handleLuminanceConfirm" 
          class="confirm-btn"
          :disabled="selectedPalettes.size === 0"
        >
          Continue to Hue Selection
        </button>
        
        <!-- Hue step buttons -->
        <div v-if="step === 'hue'" class="hue-step-buttons">
          <button @click="goBackToLuminance" class="back-btn">
            Back to Luminance Selection
          </button>
          <button 
            @click="handleHueConfirm" 
            class="confirm-btn"
          >
            Use Selected Palettes
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: var(--wp--preset--color--nord-snow-storm-2);
  border-radius: 8px;
  padding: 2rem;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.5rem;
}

/* Step indicator */
.step-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
  padding: 0.5rem;
  background-color: var(--wp--preset--color--nord-snow-storm-0);
  border-radius: 4px;
}

.step {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-weight: 500;
  color: var(--wp--preset--color--nord-polar-night-0);
  opacity: 0.7;
}

.step.active {
  background-color: var(--wp--preset--color--nord-frost-3);
  color: var(--wp--preset--color--nord-snow-storm-2);
  opacity: 1;
}

.step-divider {
  height: 1px;
  width: 30px;
  background-color: var(--wp--preset--color--nord-polar-night-0);
  opacity: 0.3;
  margin: 0 0.5rem;
}

.url-input {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.url-input input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid var(--wp--preset--color--nord-snow-storm-0);
  border-radius: 4px;
}

.fetch-btn {
  padding: 0.5rem 1rem;
  background-color: var(--wp--preset--color--nord-frost-3);
  color: var(--wp--preset--color--nord-snow-storm-2);
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.fetch-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.error-message {
  color: var(--wp--preset--color--nord-aurora-red);
  margin-bottom: 1rem;
  padding: 0.5rem;
  border: 1px solid currentColor;
  border-radius: 4px;
}

.palettes-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.palette-option {
  border: 1px solid var(--wp--preset--color--nord-snow-storm-0);
  border-radius: 4px;
  padding: 1rem;
}

.color-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin: 1rem 0;
}

.color-swatch {
  width: 30px;
  height: 30px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.select-btn {
  width: 100%;
  padding: 0.5rem;
  background-color: var(--wp--preset--color--nord-frost-3);
  color: var(--wp--preset--color--nord-snow-storm-2);
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.select-btn.selected {
  background-color: var(--wp--preset--color--nord-frost-2);
  color: var(--wp--preset--color--nord-snow-storm-2);
}

.select-btn:hover {
  background-color: var(--wp--preset--color--nord-frost-2);
}

/* Hue selection styles */
.hue-selection {
  margin-top: 1rem;
}

.section-header {
  margin-bottom: 0.5rem;
}

.section-header h4 {
  margin-bottom: 0.25rem;
}

.selection-hint {
  font-size: 0.85rem;
  color: var(--wp--preset--color--nord-polar-night-0);
  opacity: 0.7;
  margin: 0;
}

.luminance-preview {
  padding: 0.5rem;
  background-color: var(--wp--preset--color--nord-snow-storm-0);
  border-radius: 4px;
  margin-bottom: 1.5rem;
}

.hue-colors-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.hue-color-option {
  cursor: pointer;
  transition: all 0.2s ease;
}

.hue-color-option:hover {
  transform: scale(1.1);
}

.hue-color-option.selected {
  transform: scale(1.2);
  box-shadow: 0 0 0 2px var(--wp--preset--color--nord-frost-3);
}

.modal-footer {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--wp--preset--color--nord-snow-storm-0);
  text-align: center;
}

.hue-step-buttons {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.back-btn {
  padding: 0.75rem 1.5rem;
  background-color: var(--wp--preset--color--nord-snow-storm-0);
  color: var(--wp--preset--color--nord-polar-night-0);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
}

.back-btn:hover {
  background-color: var(--wp--preset--color--nord-snow-storm-1);
}

.confirm-btn {
  padding: 0.75rem 2rem;
  background-color: var(--wp--preset--color--nord-frost-3);
  color: var(--wp--preset--color--nord-snow-storm-2);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
}

.confirm-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.confirm-btn:not(:disabled):hover {
  background-color: var(--wp--preset--color--nord-frost-2);
}
</style>
