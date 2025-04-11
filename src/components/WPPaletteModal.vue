<script setup>
import { ref, onMounted } from 'vue';
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

const handleConfirm = () => {
  // Combine all selected palettes
  const allColors = [];
  selectedPalettes.value.forEach(name => {
    allColors.push(...palettes.value[name]);
  });

  // Sort colors by luminance (dark to light)
  const sortedColors = allColors.sort((a, b) => {
    const lumA = chroma(a).luminance();
    const lumB = chroma(b).luminance();
    return lumA - lumB;
  });

  // Remove duplicates while preserving order
  const uniqueColors = [...new Set(sortedColors)];

  emit('select', { 
    name: 'combined', 
    colors: uniqueColors
  });
  emit('close');
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
        <h3>Import WordPress Palette</h3>
        <button class="close-btn" @click="$emit('close')">&times;</button>
      </div>

      <div class="url-input">
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

      <div v-if="Object.keys(palettes).length > 0" class="palettes-container">
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
      
      <div v-if="Object.keys(palettes).length > 0" class="modal-footer">
        <button 
          @click="handleConfirm" 
          class="confirm-btn"
          :disabled="selectedPalettes.size === 0"
        >
          Use Selected Palettes
        </button>
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

.modal-footer {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--wp--preset--color--nord-snow-storm-0);
  text-align: center;
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
