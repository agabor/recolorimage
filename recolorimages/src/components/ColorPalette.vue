<script setup>
import { ref, computed, watch } from 'vue';
import { DEFAULT_PALETTES } from '../utils/colorUtils';
import chroma from 'chroma-js';

const props = defineProps({
  selectedPalette: {
    type: Object,
    required: true
  },
  matchedPaletteStats: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['update:palette', 'custom-palette', 'toggle-hue']);

const palettes = ref(Object.keys(DEFAULT_PALETTES));
const selectedPaletteName = ref(props.selectedPalette.name);
// Convert chroma.Color objects to hex strings for the color pickers
const customLuminancePalette = ref([...props.selectedPalette.luminance].map(color => color.hex()));
const customHuePalette = ref([...props.selectedPalette.hue].map(color => color.hex()));
const isCustomizing = ref(false);

// Watch for changes in the selected palette name
watch(selectedPaletteName, (newValue) => {
  if (newValue === 'custom') {
    isCustomizing.value = true;
  } else {
    emit('update:palette', newValue);
    isCustomizing.value = false;
  }
});

// Watch for changes in the selected palette from parent
watch(() => props.selectedPalette.name, (newValue) => {
  selectedPaletteName.value = newValue;
  
  if (newValue === 'custom') {
    // Convert chroma.Color objects to hex strings for the color pickers
    customLuminancePalette.value = [...props.selectedPalette.luminance].map(color => color.hex());
    customHuePalette.value = [...props.selectedPalette.hue].map(color => color.hex());
  }
});

const luminanceColors = computed(() => {
  return [...props.selectedPalette.luminance]
    .sort((a, b) => a.luminance() - b.luminance())
    .map(color => color.hex());
});

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
  // Convert hex strings back to chroma.Color objects
  const luminanceColors = customLuminancePalette.value.map(hex => chroma(hex));
  const hueColors = customHuePalette.value.map(hex => chroma(hex));
  
  emit('custom-palette', {
    luminance: luminanceColors,
    hue: hueColors
  });
};

const cancelCustomization = () => {
  isCustomizing.value = false;
  selectedPaletteName.value = props.selectedPalette.name;
};

// Toggle hue color enabled/disabled state
const toggleHueColor = (index) => {
  emit('toggle-hue', index);
};

// Check if a hue color is disabled
const isHueDisabled = (index) => {
  return props.selectedPalette.disabledHues && props.selectedPalette.disabledHues.includes(index);
};

// Get the match percentage for a color
const getMatchPercentage = (index) => {
  const stat = props.matchedPaletteStats.find(stat => stat.index === index);
  return stat ? stat.percentage : 0;
};
</script>

<template>
  <div class="color-palette">
    <div class="palette-selection">
      <label for="palette-select">Palette:</label>
      <select id="palette-select" v-model="selectedPaletteName">
        <option v-for="palette in palettes" :key="palette" :value="palette">
          {{ palette.charAt(0).toUpperCase() + palette.slice(1) }}
        </option>
        <option value="custom">Custom</option>
      </select>
    </div>
    
    <div v-if="!isCustomizing" class="palette-preview">
      <div class="palette-section">
        <h3>Luminance Palette</h3>
        <div class="luminance-swatches">
          <div 
            v-for="(color, index) in luminanceColors" 
            :key="index"
            class="color-swatch luminance-swatch"
            :style="{ backgroundColor: color }"
          ></div>
        </div>
      </div>
      
      <div class="palette-section">
        <h3>Hue Palette <small>(click to enable/disable)</small></h3>
        <p v-if="matchedPaletteStats.length > 0" class="matched-info">
          Percentages show how many mappable pixels were matched to each color (disabled colors are not used)
        </p>
        <div class="hue-swatches">
          <div 
            v-for="(color, index) in selectedPalette.hue" 
            :key="index"
            class="color-swatch"
            :class="{ 
              'disabled': isHueDisabled(index),
              'matched': !isHueDisabled(index) && getMatchPercentage(index) > 0
            }"
            :style="{ backgroundColor: color.hex() }"
            :data-percentage="getMatchPercentage(index)"
            @click="toggleHueColor(index)"
          ></div>
        </div>
      </div>
    </div>
    
    <div v-else class="custom-palette-editor">
      <div class="palette-section">
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
      </div>
      
      <div class="palette-section">
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
      </div>
      
      <div class="custom-palette-actions">
        <button class="apply-btn" @click="applyCustomPalette">Apply Custom Palette</button>
        <button class="cancel-btn" @click="cancelCustomization">Cancel</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.color-palette {
  margin-bottom: 2rem;
}

.palette-selection {
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
}

.palette-selection label {
  margin-right: 0.5rem;
  font-weight: bold;
}

.palette-selection select {
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid #ccc;
  background-color: white;
  font-size: 1rem;
}

.palette-preview {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.palette-section {
  margin-bottom: 1rem;
}

.palette-section h3 {
  margin-top: 0;
  margin-bottom: 0.5rem;
  font-size: 1rem;
  color: #333;
}

.palette-section small {
  font-size: 0.8rem;
  font-weight: normal;
  color: #666;
}

.luminance-swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.luminance-swatch {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

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

.color-swatch:hover {
  transform: scale(1.05);
}

.color-swatch.disabled {
  opacity: 0.3;
  position: relative;
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
  transform: scale(1.1);
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.7), 0 0 0 6px rgba(76, 175, 80, 0.7);
  z-index: 1;
}

.color-swatch.matched::before {
  content: attr(data-percentage) '%';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 0.9rem;
  font-weight: bold;
  text-shadow: 0 0 3px rgba(0, 0, 0, 0.7);
}

.matched-info {
  font-size: 0.8rem;
  color: #666;
  margin-top: -0.3rem;
  margin-bottom: 0.5rem;
  font-style: italic;
}

.custom-palette-editor {
  margin-top: 1rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.add-color-btn {
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.color-editor {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
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
  background: none;
  cursor: pointer;
}

.color-text {
  flex: 1;
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid #ccc;
  font-family: monospace;
}

.remove-color-btn {
  background-color: #f44336;
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove-color-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.custom-palette-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

.apply-btn, .cancel-btn {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  border: none;
  font-size: 1rem;
  cursor: pointer;
}

.apply-btn {
  background-color: #4CAF50;
  color: white;
}

.cancel-btn {
  background-color: #f44336;
  color: white;
}
</style>
