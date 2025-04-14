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
const colorNames = ref({}); // Map of color codes to their variable names
const loading = ref(false);
const error = ref(null);
const urlInput = ref('');
const selectedPalettes = ref(new Set());
const selectedHueColors = ref(new Set());
const step = ref('luminance'); // 'luminance' or 'hue'
const luminancePalette = ref([]);

// Default grayscale palette
const grayscalePalette = [
  '#000000', // Black
  '#404040', // Dark gray
  '#808080', // Medium gray
  '#C0C0C0', // Light gray
  '#FFFFFF'  // White
];

// Track if grayscale palette is selected
const isGrayscaleSelected = ref(false);

// Select grayscale palette
const selectGrayscalePalette = () => {
  // Toggle selection
  isGrayscaleSelected.value = !isGrayscaleSelected.value;
  
  // Clear other selections if grayscale is selected
  if (isGrayscaleSelected.value) {
    selectedPalettes.value.clear();
  }
};

// All colors from WordPress site
const allColors = computed(() => {
  const colors = [];
  Object.values(palettes.value).forEach(palette => {
    colors.push(...palette);
  });
  return [...new Set(colors)]; // Remove duplicates
});

// Colors available for hue selection (all colors except those in luminance palette, with sufficient saturation, and not too light/dark)
const availableHueColors = computed(() => {
  if (!luminancePalette.value.length) return [];
  
  // If no WordPress palettes are loaded, return an empty array
  if (Object.keys(palettes.value).length === 0) return [];
  
  // Thresholds
  const MIN_SATURATION = 0.2; // 20% minimum saturation
  const MIN_LUMINANCE = 0.15; // Exclude very dark colors
  const MAX_LUMINANCE = 0.85; // Exclude very light colors
  
  return allColors.value.filter(color => {
    // Skip colors already in luminance palette
    if (luminancePalette.value.includes(color)) return false;
    
    try {
      // Get color properties using chroma.js
      const chromaColor = chroma(color);
      const hsl = chromaColor.hsl();
      const saturation = hsl[1]; // Saturation is the second value in HSL
      const luminance = chromaColor.luminance();
      
      // Filter out colors with low saturation or extreme luminance
      return saturation >= MIN_SATURATION && 
             luminance >= MIN_LUMINANCE && 
             luminance <= MAX_LUMINANCE;
    } catch {
      // If color parsing fails, exclude it
      return false;
    }
  });
});

const fetchPalettes = async () => {
  loading.value = true;
  error.value = null;
  try {
    // Fetch palettes (color values)
    palettes.value = await fetchWordPressColorPalettes(urlInput.value);
    if (Object.keys(palettes.value).length === 0) {
      error.value = 'No numbered color palettes found';
      return;
    }
    
    // Fetch CSS to extract color names
    try {
      const proxyUrl = `https://recolorimage.com/wp-admin/admin-ajax.php?action=fetch_wp_styles&url=${encodeURIComponent(urlInput.value)}`;
      const response = await fetch(proxyUrl);
      const data = await response.json();
      
      if (data.success) {
        const html = data.data.html;
        const styleMatch = html.match(/<style id='global-styles-inline-css'>([\s\S]*?)<\/style>/);
        
        if (styleMatch) {
          const css = styleMatch[1];
          const varRegex = /--wp--preset--color--([\w-]+):\s*(#[A-Fa-f0-9]{6})/g;
          let match;
          
          // Clear previous color names
          colorNames.value = {};
          
          // Extract color names
          while ((match = varRegex.exec(css)) !== null) {
            const name = match[1];
            const color = match[2];
            colorNames.value[color.toLowerCase()] = name;
          }
        }
      }
    } catch (nameErr) {
      console.error('Failed to fetch color names:', nameErr);
      // Continue without color names, not a critical error
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
    // Clear grayscale selection if a WordPress palette is selected
    if (isGrayscaleSelected.value) {
      isGrayscaleSelected.value = false;
    }
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
  
  // Add grayscale palette if selected
  if (isGrayscaleSelected.value) {
    allLuminanceColors.push(...grayscalePalette);
  } else {
    // Add WordPress palettes if selected
    selectedPalettes.value.forEach(name => {
      allLuminanceColors.push(...palettes.value[name]);
    });
  }

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
  
  // Extract domain name from URL
  let schemeName = 'wordpress';
  try {
    const url = new URL(urlInput.value);
    schemeName = url.hostname.replace('www.', '');
  } catch (e) {
    console.error('Could not parse URL, using default name:', e);
  }
  
  emit('select', { 
    name: schemeName, 
    colors: luminancePalette.value,
    hueColors: hueColors,
    overwrite: true // Signal to overwrite if scheme with same name exists
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
      <div v-if="step === 'luminance'" class="palettes-container">
        <!-- WordPress palettes (shown only when loaded) -->
        <template v-if="Object.keys(palettes).length > 0">
          <!-- Regular numbered palettes -->
          <div 
            v-for="(colors, name) in palettes" 
            :key="name"
            class="palette-option"
            v-show="name !== 'all-colors'"
          >
            <h4>
              {{ name.startsWith('gradient-') ? 'Gradient: ' + name.replace('gradient-', '').replace(/-/g, ' ') : name.replace(/-/g, ' ') }}
              <span v-if="name.startsWith('gradient-')" class="gradient-badge">Luminance Gradient</span>
            </h4>
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
          
          <!-- Default Grayscale Option (shown only after import) -->
          <div class="palette-option grayscale-option">
            <h4>
              Grayscale
              <span class="gradient-badge">Default Option</span>
            </h4>
            <div class="color-preview">
              <div 
                v-for="(color, index) in grayscalePalette" 
                :key="index"
                class="color-swatch"
                :style="{ backgroundColor: color }"
                :title="color"
              ></div>
            </div>
            <button 
              @click="selectGrayscalePalette"
              class="select-btn"
              :class="{ 'selected': isGrayscaleSelected }"
            >
              {{ isGrayscaleSelected ? 'Selected' : 'Select' }}
            </button>
          </div>
        </template>
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
        
        <!-- No hue colors available message -->
        <div v-if="availableHueColors.length === 0" class="no-hue-colors-message">
          <p>No hue colors available. You can proceed without selecting hue colors, or go back to select WordPress palettes.</p>
        </div>
        
        <!-- Hue colors grid -->
        <div v-else class="hue-colors-grid">
          <div 
            v-for="(color, index) in availableHueColors" 
            :key="`hue-${index}`"
            class="hue-color-item"
            :class="{ 'selected': selectedHueColors.has(color) }"
            @click="toggleHueColorSelection(color)"
          >
            <div 
              class="color-swatch hue-color-option"
              :style="{ backgroundColor: color }"
            ></div>
            <div class="color-info">
              <div v-if="colorNames[color.toLowerCase()]" class="color-name">
                {{ colorNames[color.toLowerCase()] }}
              </div>
              <span class="color-code">{{ color }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Footer buttons -->
      <div class="modal-footer">
        <!-- Luminance step buttons -->
        <button 
          v-if="step === 'luminance'"
          @click="handleLuminanceConfirm" 
          class="confirm-btn"
          :disabled="selectedPalettes.size === 0 && !isGrayscaleSelected"
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

.grayscale-option {
  grid-column: 1 / -1; /* Span all columns */
  background-color: var(--wp--preset--color--nord-snow-storm-0);
  border: 2px solid var(--wp--preset--color--nord-frost-3);
  margin-top: 1rem;
}

.grayscale-option h4 {
  color: var(--wp--preset--color--nord-frost-3);
  font-weight: bold;
}

.all-colors-option {
  grid-column: 1 / -1; /* Span all columns */
  background-color: var(--wp--preset--color--nord-snow-storm-0);
  border: 2px solid var(--wp--preset--color--nord-frost-3);
}

.all-colors-option h4 {
  color: var(--wp--preset--color--nord-frost-3);
  font-weight: bold;
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

.no-hue-colors-message {
  padding: 1.5rem;
  background-color: var(--wp--preset--color--nord-snow-storm-0);
  border-radius: 4px;
  margin-bottom: 1.5rem;
  text-align: center;
  color: var(--wp--preset--color--nord-polar-night-0);
}

.no-hue-colors-message p {
  margin: 0;
  line-height: 1.5;
}

.hue-colors-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.hue-color-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 4px;
  transition: all 0.2s ease;
  background-color: var(--wp--preset--color--nord-snow-storm-0);
}

.hue-color-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.hue-color-item.selected {
  background-color: var(--wp--preset--color--nord-frost-0);
  transform: translateY(-3px);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15);
}

.hue-color-option {
  width: 50px;
  height: 50px;
  margin-bottom: 0.5rem;
  transition: all 0.2s ease;
  border: 2px solid transparent;
}

.selected .hue-color-option {
  border-color: var(--wp--preset--color--nord-frost-3);
}

.color-info {
  width: 100%;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.color-name {
  font-size: 0.8rem;
  font-weight: 500;
  margin-bottom: 0.25rem;
  color: var(--wp--preset--color--nord-polar-night-0);
  word-break: break-word;
}

.color-code {
  font-size: 0.75rem;
  font-family: monospace;
  word-break: break-all;
  color: var(--wp--preset--color--nord-polar-night-0);
  opacity: 0.8;
}

.selected .color-name,
.selected .color-code {
  color: var(--wp--preset--color--nord-snow-storm-2);
}

.selected .color-code {
  font-weight: bold;
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

.gradient-badge {
  display: inline-block;
  font-size: 0.7rem;
  background-color: var(--wp--preset--color--nord-frost-0);
  color: var(--wp--preset--color--nord-snow-storm-2);
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  margin-left: 0.5rem;
  vertical-align: middle;
  font-weight: normal;
}
</style>
