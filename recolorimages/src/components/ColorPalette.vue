<script setup>
import { ref, computed, watch } from 'vue';
import { DEFAULT_PALETTES } from '../utils/colorUtils';

const props = defineProps({
  selectedPalette: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['update:palette', 'custom-palette']);

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

const luminanceGradient = computed(() => {
  const colors = props.selectedPalette.luminance;
  if (colors.length < 2) return 'linear-gradient(to right, #000, #fff)';
  
  const stops = colors.map((color, index) => {
    const percent = (index / (colors.length - 1)) * 100;
    return `${color.hex()} ${percent}%`;
  });
  
  return `linear-gradient(to right, ${stops.join(', ')})`;
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
        <div class="luminance-gradient" :style="{ background: luminanceGradient }"></div>
      </div>
      
      <div class="palette-section">
        <h3>Hue Palette</h3>
        <div class="hue-swatches">
          <div 
            v-for="(color, index) in selectedPalette.hue" 
            :key="index"
            class="color-swatch"
            :style="{ backgroundColor: color.hex() }"
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

.luminance-gradient {
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
